import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";
import { calculateDealHealth, type DealHealthResult } from "../utils/dealHealth.util";
import { THIRTY_DAYS_MS } from "../lib/constants";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  assigneeId?: string;
  contactId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// Stage-gated task templates: auto-created when a deal moves to a new stage
const STAGE_TASKS: Record<
  string,
  Array<{ title: string; taskType: string; delayDays: number }>
> = {
  QUALIFIED: [
    { title: "הכן הצעת מחיר", taskType: "TASK", delayDays: 0 },
    { title: "שיחת הכשרה עם הלקוח", taskType: "CALL", delayDays: 1 },
  ],
  PROPOSAL: [
    { title: "שלח הצעה ללקוח", taskType: "EMAIL", delayDays: 0 },
    { title: "מעקב על הצעה", taskType: "FOLLOW_UP", delayDays: 3 },
  ],
  NEGOTIATION: [
    { title: "שיחת סגירה", taskType: "CALL", delayDays: 0 },
    { title: "הכן חוזה", taskType: "TASK", delayDays: 1 },
  ],
  CLOSED_WON: [
    { title: "שלח אישור עסקה", taskType: "EMAIL", delayDays: 0 },
    { title: "אונבורדינג לקוח חדש", taskType: "MEETING", delayDays: 2 },
  ],
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const STAGE_PROBABILITY: Record<string, number> = {
  LEAD: 10,
  QUALIFIED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

const SORTABLE_FIELDS = [
  "title",
  "value",
  "stage",
  "priority",
  "probability",
  "expectedCloseDate",
  "createdAt",
  "updatedAt",
] as const;

export async function list(params: ListParams) {
  const {
    workspaceId,
    page: rawPage = 1,
    limit: rawLimit = 50,
    search,
    stage,
    assigneeId,
    contactId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  // Clamp page/limit to valid positive ranges — negative page causes negative
  // skip (Prisma error), and limit<=0 silently returns empty results.
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.DealWhereInput = { workspaceId };

  if (search) {
    // Sanitize LIKE wildcards so user input like "%" or "_" doesn't match
    // everything.  Prisma's `contains` maps to SQL LIKE '%…%' — percent and
    // underscore would be interpreted as wildcards without escaping.
    const safeSearch = search.replace(/[%_]/g, "\\$&");
    where.title = { contains: safeSearch, mode: "insensitive" };
  }
  if (stage) {
    where.stage = stage as any;
  }
  if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  if (contactId) {
    where.contactId = contactId;
  }

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
        company: { select: { id: true, name: true } },
        assignee: { include: { user: { select: { name: true } } } },
        tags: { include: { tag: true } },
        tasks: {
          where: { status: { not: "DONE" } },
          select: { id: true },
        },
        activities: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { id: true },
        },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    data: deals.map((d) => {
      const health = calculateDealHealth({
        lastActivityAt: d.lastActivityAt,
        openTaskCount: d.tasks.length,
        bantFields: {
          budget: d.value !== null && Number(d.value) > 0,
          authority: !!d.contactId,
          need: !!d.notes && d.notes.trim().length > 0,
          timeline: !!d.expectedClose,
        },
        stageChangedAt: d.stageChangedAt,
        recentActivityCount: d.activities.length,
      });

      return {
        id: d.id,
        title: d.title,
        value: d.value ? Number(d.value) : 0,
        currency: d.currency,
        stage: d.stage,
        priority: d.priority,
        probability: d.probability,
        contact: d.contact
          ? {
              id: d.contact.id,
              name: `${d.contact.firstName} ${d.contact.lastName}`,
              phone: d.contact.phone || null,
            }
          : null,
        company: d.company,
        assignee: d.assignee
          ? { id: d.assignee.id, name: d.assignee.user.name }
          : null,
        expectedClose: d.expectedClose,
        stageChangedAt: d.stageChangedAt,
        daysInStage: Math.floor(
          (Date.now() - new Date(d.stageChangedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        lastActivityAt: d.lastActivityAt,
        lostReason: d.lostReason,
        closedAt: d.closedAt,
        notes: d.notes,
        tags: d.tags.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color,
        })),
        health,
        createdAt: d.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function pipeline(workspaceId: string) {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dealInclude = {
    contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
    company: { select: { id: true, name: true } },
    assignee: { include: { user: { select: { name: true } } } },
    tags: { include: { tag: true } },
    tasks: {
      where: { status: { not: "DONE" as const } },
      orderBy: { dueDate: "asc" as const },
      take: 1,
    },
    activities: {
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { id: true },
    },
  };

  // Fetch open deals and recent closed deals in parallel.  The previous
  // single query used orderBy: createdAt ASC with take: 500 — in workspaces
  // with 500+ old closed deals, newer open deals were silently dropped from
  // the pipeline view because the cap was consumed by old closed records.
  const [openDeals, closedDeals] = await Promise.all([
    prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      include: dealInclude,
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { in: ["CLOSED_WON", "CLOSED_LOST"] },
        closedAt: { gte: startOfMonth },
      },
      include: dealInclude,
      orderBy: { closedAt: "desc" },
      take: 100,
    }),
  ]);

  const deals = [...openDeals, ...closedDeals];

  const stages = [
    "LEAD",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];
  const grouped: Record<string, any[]> = {};

  for (const stage of stages) {
    grouped[stage] = [];
  }

  for (const d of deals) {
    const daysInStage = Math.floor(
      (Date.now() - new Date(d.stageChangedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const health = calculateDealHealth({
      lastActivityAt: d.lastActivityAt,
      openTaskCount: d.tasks.length,
      bantFields: {
        budget: d.value !== null && Number(d.value) > 0,
        authority: !!d.contactId,
        need: !!d.notes && d.notes.trim().length > 0,
        timeline: !!d.expectedClose,
      },
      stageChangedAt: d.stageChangedAt,
      recentActivityCount: d.activities.length,
    });
    grouped[d.stage]?.push({
      id: d.id,
      title: d.title,
      value: d.value ? Number(d.value) : 0,
      currency: d.currency,
      stage: d.stage,
      priority: d.priority,
      probability: d.probability,
      contact: d.contact
        ? {
            id: d.contact.id,
            name: `${d.contact.firstName} ${d.contact.lastName}`,
            phone: d.contact.phone || null,
          }
        : null,
      company: d.company,
      assignee: d.assignee
        ? { id: d.assignee.id, name: d.assignee.user.name }
        : null,
      expectedClose: d.expectedClose,
      stageChangedAt: d.stageChangedAt,
      daysInStage,
      lastActivityAt: d.lastActivityAt,
      lostReason: d.lostReason,
      closedAt: d.closedAt,
      nextTask: d.tasks[0] || null,
      health,
      tags: d.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      createdAt: d.createdAt,
    });
  }

  // Compute totals per stage
  const stageTotals = stages.map((stage) => ({
    stage,
    count: grouped[stage].length,
    totalValue: grouped[stage].reduce((sum, d) => sum + d.value, 0),
  }));

  // Forecast calculations
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const openStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];

  // Forecast = open deals with expectedClose this month × probability
  const forecastThisMonth = deals
    .filter((d) => {
      if (!openStages.includes(d.stage)) return false;
      if (!d.expectedClose) return false;
      const ec = new Date(d.expectedClose);
      return ec >= startOfMonth && ec <= endOfMonth;
    })
    .reduce((sum, d) => sum + (d.value ? Number(d.value) : 0) * (d.probability / 100), 0);

  // Won this month = CLOSED_WON with closedAt in this month
  // Computed from the already-loaded deals array — no extra DB round-trip needed
  const wonThisMonth = deals
    .filter(
      (d) =>
        d.stage === "CLOSED_WON" &&
        d.closedAt !== null &&
        new Date(d.closedAt) >= startOfMonth &&
        new Date(d.closedAt) <= endOfMonth,
    )
    .reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);

  // Total pipeline = all open deals
  const totalPipeline = deals
    .filter((d) => openStages.includes(d.stage))
    .reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);

  return {
    stages: grouped,
    totals: stageTotals,
    forecast: {
      forecastThisMonth: Math.round(forecastThisMonth),
      wonThisMonth: Math.round(wonThisMonth),
      totalPipeline: Math.round(totalPipeline),
    },
  };
}

export async function getById(workspaceId: string, id: string) {
  const deal = await prisma.deal.findFirst({
    where: { id, workspaceId },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      company: true,
      assignee: { include: { user: { select: { name: true } } } },
      tags: { include: { tag: true } },
      activities: {
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      tasks: {
        include: {
          assignee: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!deal) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const openTaskCount = deal.tasks.filter((t) => t.status !== "DONE").length;
  const recentActivityCount = deal.activities.filter(
    (a) => new Date(a.createdAt) >= thirtyDaysAgo,
  ).length;

  const health = calculateDealHealth({
    lastActivityAt: deal.lastActivityAt,
    openTaskCount,
    bantFields: {
      budget: deal.value !== null && Number(deal.value) > 0,
      authority: !!deal.contactId,
      need: !!deal.notes && deal.notes.trim().length > 0,
      timeline: !!deal.expectedClose,
    },
    stageChangedAt: deal.stageChangedAt,
    recentActivityCount,
  });

  return {
    ...deal,
    value: deal.value ? Number(deal.value) : 0,
    daysInStage: Math.floor(
      (Date.now() - new Date(deal.stageChangedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    health,
  };
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    title: string;
    value?: number;
    stage?: string;
    priority?: string;
    contactId: string;
    companyId?: string;
    probability?: number;
    expectedClose?: string;
    notes?: string;
  },
) {
  // Verify foreign key references in parallel — independent queries
  const [contactRef, companyRef] = await Promise.all([
    data.contactId
      ? prisma.contact.findFirst({ where: { id: data.contactId, workspaceId }, select: { id: true } })
      : null,
    data.companyId
      ? prisma.company.findFirst({ where: { id: data.companyId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (data.contactId && !contactRef)
    throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");
  if (data.companyId && !companyRef)
    throw new AppError(400, "INVALID_REFERENCE", "Company not found in workspace");

  const deal = await prisma.deal.create({
    data: {
      workspaceId,
      title: data.title,
      value: data.value,
      stage: (data.stage as any) || "LEAD",
      priority: (data.priority as any) || "MEDIUM",
      contactId: data.contactId,
      companyId: data.companyId,
      assigneeId: memberId,
      probability:
        data.probability ?? STAGE_PROBABILITY[data.stage || "LEAD"] ?? 10,
      expectedClose: data.expectedClose
        ? new Date(data.expectedClose)
        : undefined,
      notes: data.notes,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
      company: { select: { id: true, name: true } },
      assignee: { include: { user: { select: { name: true } } } },
    },
  });

  enqueueAutomationTrigger({
    workspaceId,
    trigger: "DEAL_CREATED",
    entityType: "deal",
    entityId: deal.id,
    data: {
      title: deal.title,
      stage: deal.stage,
      value: data.value,
      priority: deal.priority,
    },
  }).catch(() => {});

  return deal;
}

export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    title: string;
    value: number;
    stage: string;
    priority: string;
    contactId: string;
    companyId: string | null;
    assigneeId: string;
    probability: number;
    expectedClose: string;
    notes: string;
    lostReason: string;
    bantData: Record<string, string> | null;
  }>,
  /** memberId of the user triggering the update, used as fallback for auto-task creation */
  triggeredByMemberId?: string,
) {
  // Fetch deal + FK references in parallel — all independent queries
  const [existing, contactRef, companyRef, assigneeRef] = await Promise.all([
    prisma.deal.findFirst({ where: { id, workspaceId } }),
    data.contactId
      ? prisma.contact.findFirst({ where: { id: data.contactId, workspaceId }, select: { id: true } })
      : null,
    data.companyId
      ? prisma.company.findFirst({ where: { id: data.companyId, workspaceId }, select: { id: true } })
      : null,
    data.assigneeId
      ? prisma.workspaceMember.findFirst({ where: { id: data.assigneeId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Deal not found");
  if (data.contactId && !contactRef)
    throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");
  if (data.companyId && !companyRef)
    throw new AppError(400, "INVALID_REFERENCE", "Company not found in workspace");
  if (data.assigneeId && !assigneeRef)
    throw new AppError(400, "INVALID_REFERENCE", "Assignee not found in workspace");

  // Build updateData from known fields explicitly instead of blindly
  // spreading { ...data }. The previous approach passed raw string values
  // (e.g. expectedClose as "2026-04-10") directly to Prisma, relying on
  // auto-coercion. This broke when expectedClose was an empty string and
  // made it impossible to set fields to null (e.g. clearing expectedClose).
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.contactId !== undefined) updateData.contactId = data.contactId;
  if (data.companyId !== undefined) updateData.companyId = data.companyId;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
  if (data.probability !== undefined) updateData.probability = data.probability;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.lostReason !== undefined) updateData.lostReason = data.lostReason;
  if (data.bantData !== undefined) updateData.bantData = data.bantData;
  if (data.expectedClose !== undefined) {
    updateData.expectedClose = data.expectedClose
      ? new Date(data.expectedClose)
      : null;
  }

  // Track stage changes
  if (data.stage && data.stage !== existing.stage) {
    updateData.stageChangedAt = new Date();
    updateData.stage = data.stage;
    // Auto-set probability if not provided
    if (data.probability === undefined) {
      updateData.probability =
        STAGE_PROBABILITY[data.stage] ?? existing.probability;
    }
    // Set closedAt for won/lost
    if (data.stage === "CLOSED_WON" || data.stage === "CLOSED_LOST") {
      updateData.closedAt = new Date();
    }
    // Clear closedAt when re-opening a previously closed deal
    if (
      data.stage !== "CLOSED_WON" &&
      data.stage !== "CLOSED_LOST" &&
      (existing.stage === "CLOSED_WON" || existing.stage === "CLOSED_LOST")
    ) {
      updateData.closedAt = null;
    }
  } else if (data.stage !== undefined) {
    updateData.stage = data.stage;
  }

  // Use updateMany with workspaceId for defense-in-depth (prevents a TOCTOU
  // gap where the deal could be reassigned between the findFirst check and the
  // actual write), then re-fetch with includes.
  const updateResult = await prisma.deal.updateMany({
    where: { id, workspaceId },
    data: updateData,
  });
  if (updateResult.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }
  const updated = await prisma.deal.findFirstOrThrow({
    where: { id, workspaceId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
      company: { select: { id: true, name: true } },
      assignee: { include: { user: { select: { name: true } } } },
    },
  });

  // Stage change side-effects (fire-and-forget)
  if (data.stage && data.stage !== existing.stage) {
    const oldStage = existing.stage;
    const newStage = data.stage;

    // 1. Auto-create tasks for the new stage
    const templates = STAGE_TASKS[newStage];
    if (templates && templates.length > 0) {
      const now = new Date();
      // Use deal assignee, then the member who triggered the update, then first workspace member as fallback
      const taskOwnerId =
        existing.assigneeId ??
        triggeredByMemberId ??
        (
          await prisma.workspaceMember.findFirst({
            where: { workspaceId },
            select: { id: true },
          })
        )?.id;
      if (taskOwnerId) {
        // Bulk-create all stage tasks in a single round-trip instead of N
        // individual creates.  This is both faster and atomic — if one row
        // fails the whole batch is rolled back, preventing partial state.
        prisma.task
          .createMany({
            data: templates.map((tpl) => ({
              workspaceId,
              title: tpl.title,
              taskType: tpl.taskType as any,
              dueDate: addDays(now, tpl.delayDays),
              dueTime: "09:00",
              contactId: existing.contactId,
              dealId: id,
              assigneeId: taskOwnerId,
              createdById: taskOwnerId,
            })),
          })
          .catch(() => {});
      }
    }

    // 2. Log STATUS_CHANGE activity
    // memberId is required on activity — use deal assignee, then the user
    // who triggered the update, skipping if neither is available.
    const activityMemberId = existing.assigneeId ?? triggeredByMemberId;
    if (activityMemberId) {
      prisma.activity
        .create({
          data: {
            workspaceId,
            type: "STATUS_CHANGE",
            subject: `שלב עסקה שונה: ${oldStage} → ${newStage}`,
            contactId: existing.contactId,
            dealId: id,
            memberId: activityMemberId,
          },
        })
        .catch(() => {});
    }

    // 3. Fire automation trigger
    enqueueAutomationTrigger({
      workspaceId,
      trigger: "DEAL_STAGE_CHANGED",
      entityType: "deal",
      entityId: id,
      data: {
        title: updated.title,
        stage: updated.stage,
        value: existing.value ? Number(existing.value) : 0,
        priority: updated.priority,
      },
      previousData: { stage: oldStage },
    }).catch(() => {});
  }

  return updated;
}

export async function remove(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId filter in a single round-trip instead of
  // find + delete (two round-trips). This also provides defense-in-depth — the
  // workspace scope is enforced at the delete level, not just the check.
  const result = await prisma.deal.deleteMany({
    where: { id, workspaceId },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }
  // Clean up orphaned notes (polymorphic relation, no FK cascade)
  await prisma.note.deleteMany({ where: { workspaceId, entityType: "deal", entityId: id } });
  return { deleted: true };
}
