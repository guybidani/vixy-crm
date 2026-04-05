import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";

const SORTABLE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "status",
  "leadScore",
  "createdAt",
  "updatedAt",
  "nextFollowUpDate",
] as const;

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  companyId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  needsFollowUp?: boolean;
}

export async function list(params: ListParams) {
  const {
    workspaceId,
    page = 1,
    limit = 25,
    search,
    status,
    companyId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
    needsFollowUp,
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.ContactWhereInput = { workspaceId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }
  if (status) {
    where.status = status as any;
  }
  if (companyId) {
    where.companyId = companyId;
  }
  if (needsFollowUp) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    where.nextFollowUpDate = { not: null, lte: today };
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        createdBy: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    data: contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
      company: c.company,
      position: c.position,
      source: c.source,
      status: c.status,
      leadScore: c.leadScore,
      leadHeat: c.leadHeat,
      lastActivityAt: c.lastActivityAt,
      tags: c.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      nextFollowUpDate: c.nextFollowUpDate,
      createdBy: c.createdBy.user.name,
      createdAt: c.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getById(workspaceId: string, id: string) {
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId },
    include: {
      company: true,
      tags: { include: { tag: true } },
      deals: {
        include: {
          assignee: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
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
      createdBy: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!contact) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  return contact;
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyId?: string;
    position?: string;
    source?: string;
    status?: string;
    leadScore?: number;
    nextFollowUpDate?: string | null;
  },
) {
  // Verify companyId belongs to this workspace (prevent cross-workspace BOLA)
  if (data.companyId) {
    const companyRef = await prisma.company.findFirst({
      where: { id: data.companyId, workspaceId },
      select: { id: true },
    });
    if (!companyRef)
      throw new AppError(400, "INVALID_REFERENCE", "Company not found in workspace");
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      createdById: memberId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      companyId: data.companyId,
      position: data.position,
      source: data.source,
      status: (data.status as any) || "LEAD",
      leadScore: data.leadScore || 0,
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  enqueueAutomationTrigger({
    workspaceId,
    trigger: "CONTACT_CREATED",
    entityType: "contact",
    entityId: contact.id,
    data: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      status: contact.status,
      source: contact.source,
    },
  }).catch(() => {});

  return contact;
}

export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyId: string | null;
    position: string;
    source: string;
    status: string;
    leadScore: number;
    leadHeat: string;
    nextFollowUpDate: string | null;
  }>,
) {
  const existing = await prisma.contact.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  // Verify companyId belongs to this workspace (prevent cross-workspace BOLA)
  if (data.companyId) {
    const companyRef = await prisma.company.findFirst({
      where: { id: data.companyId, workspaceId },
      select: { id: true },
    });
    if (!companyRef)
      throw new AppError(400, "INVALID_REFERENCE", "Company not found in workspace");
  }

  const { nextFollowUpDate, ...restData } = data;

  // Only stamp lastActivityAt when a meaningful CRM event occurs, not on
  // trivial data edits (phone/email/position fixes). Status/score changes
  // represent actual sales progression and warrant an activity stamp.
  const isSignificantChange =
    (data.status !== undefined && data.status !== existing.status) ||
    (data.leadScore !== undefined && data.leadScore !== existing.leadScore) ||
    (data.leadHeat !== undefined && data.leadHeat !== existing.leadHeat);

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...restData,
      status: restData.status as any,
      leadHeat: restData.leadHeat as any,
      ...(isSignificantChange && { lastActivityAt: new Date() }),
      ...(nextFollowUpDate !== undefined && {
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      }),
    },
    include: {
      company: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  // Fire automation triggers
  if (data.status && data.status !== existing.status) {
    enqueueAutomationTrigger({
      workspaceId,
      trigger: "CONTACT_STATUS_CHANGED",
      entityType: "contact",
      entityId: id,
      data: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        fullName: `${updated.firstName} ${updated.lastName}`,
        status: updated.status,
      },
      previousData: { status: existing.status },
    }).catch(() => {});
  }

  if (data.leadScore !== undefined && data.leadScore !== existing.leadScore) {
    enqueueAutomationTrigger({
      workspaceId,
      trigger: "LEAD_SCORE_CHANGED",
      entityType: "contact",
      entityId: id,
      data: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        leadScore: updated.leadScore,
      },
      previousData: { leadScore: existing.leadScore },
    }).catch(() => {});
  }

  return updated;
}

export async function remove(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId filter in a single round-trip instead of
  // find + delete (two round-trips). This also provides defense-in-depth — the
  // workspace scope is enforced at the delete level, not just the check.
  const result = await prisma.contact.deleteMany({
    where: { id, workspaceId },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }
  return { deleted: true };
}

export async function getTimeline(workspaceId: string, contactId: string) {
  // Verify contact belongs to workspace (return 404 instead of silent empty results)
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    select: { id: true },
  });
  if (!contact) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  const [activities, deals, tickets] = await Promise.all([
    prisma.activity.findMany({
      where: { workspaceId, contactId },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.deal.findMany({
      where: { workspaceId, contactId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.ticket.findMany({
      where: { workspaceId, contactId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { activities, deals, tickets };
}

export async function board(workspaceId: string) {
  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    include: {
      company: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const statuses = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"];
  const grouped: Record<string, any[]> = {};
  for (const s of statuses) grouped[s] = [];

  for (const c of contacts) {
    grouped[c.status]?.push({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
      position: c.position,
      status: c.status,
      leadScore: c.leadScore,
      source: c.source,
      company: c.company,
      tags: c.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
      createdAt: c.createdAt,
    });
  }

  const totals = statuses.map((s) => ({
    status: s,
    count: grouped[s].length,
  }));

  return { statuses: grouped, totals };
}
