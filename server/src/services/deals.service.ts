import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";

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
    page = 1,
    limit = 50,
    search,
    stage,
    assigneeId,
    contactId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.DealWhereInput = { workspaceId };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
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

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        assignee: { include: { user: { select: { name: true } } } },
        tags: { include: { tag: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    data: deals.map((d) => ({
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
      notes: d.notes,
      tags: d.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      createdAt: d.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function pipeline(workspaceId: string) {
  const deals = await prisma.deal.findMany({
    where: { workspaceId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      assignee: { include: { user: { select: { name: true } } } },
      tags: { include: { tag: true } },
      tasks: {
        where: { status: { not: "DONE" } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

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
          }
        : null,
      company: d.company,
      assignee: d.assignee
        ? { id: d.assignee.id, name: d.assignee.user.name }
        : null,
      expectedClose: d.expectedClose,
      stageChangedAt: d.stageChangedAt,
      daysInStage,
      nextTask: d.tasks[0] || null,
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

  return { stages: grouped, totals: stageTotals };
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

  return {
    ...deal,
    value: deal.value ? Number(deal.value) : 0,
    daysInStage: Math.floor(
      (Date.now() - new Date(deal.stageChangedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
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
      contact: { select: { id: true, firstName: true, lastName: true } },
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
  }>,
) {
  const existing = await prisma.deal.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }

  const updateData: any = { ...data, lastActivityAt: new Date() };

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
  }

  if (data.expectedClose) {
    updateData.expectedClose = new Date(data.expectedClose);
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: updateData,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      assignee: { include: { user: { select: { name: true } } } },
    },
  });

  // Fire automation triggers
  if (data.stage && data.stage !== existing.stage) {
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
      previousData: { stage: existing.stage },
    }).catch(() => {});
  }

  return updated;
}

export async function remove(workspaceId: string, id: string) {
  const existing = await prisma.deal.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }

  return prisma.deal.delete({ where: { id } });
}
