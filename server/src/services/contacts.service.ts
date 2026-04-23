import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";
import { BOARD_MAX_ITEMS } from "../lib/constants";

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
  includeDeleted?: boolean;
}

export async function list(params: ListParams) {
  const {
    workspaceId,
    page: rawPage = 1,
    limit: rawLimit = 25,
    search,
    status,
    companyId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
    needsFollowUp,
    includeDeleted = false,
  } = params;
  // Clamp page/limit to valid positive ranges — negative page causes negative
  // skip (Prisma error), and limit<=0 silently returns empty results.
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  // Soft-delete: exclude tombstoned contacts by default. Admin UIs can opt in
  // via includeDeleted=true to view/restore them.
  const where: Prisma.ContactWhereInput = { workspaceId };
  if (!includeDeleted) {
    where.deletedAt = null;
  }

  if (search) {
    // Sanitize LIKE wildcards so user input like "%" or "_" doesn't match
    // everything.  Prisma's `contains` maps to SQL LIKE '%…%' — percent and
    // underscore would be interpreted as wildcards without escaping.
    const safeSearch = search.replace(/[%_]/g, "\\$&");
    where.OR = [
      { firstName: { contains: safeSearch, mode: "insensitive" } },
      { lastName: { contains: safeSearch, mode: "insensitive" } },
      { email: { contains: safeSearch, mode: "insensitive" } },
      { phone: { contains: safeSearch } },
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
    where: { id, workspaceId, deletedAt: null },
    include: {
      company: true,
      tags: { include: { tag: true } },
      deals: {
        where: { deletedAt: null },
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
        where: { deletedAt: null },
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
      where: { id: data.companyId, workspaceId, deletedAt: null },
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
  // Fetch contact and verify companyId ownership in parallel — independent queries
  const [existing, companyRef] = await Promise.all([
    prisma.contact.findFirst({ where: { id, workspaceId, deletedAt: null } }),
    data.companyId
      ? prisma.company.findFirst({ where: { id: data.companyId, workspaceId, deletedAt: null }, select: { id: true } })
      : null,
  ]);
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }
  if (data.companyId && !companyRef)
    throw new AppError(400, "INVALID_REFERENCE", "Company not found in workspace");

  // Build updateData from explicit fields instead of spreading { ...data }.
  // Blind spread risks passing unexpected fields directly to Prisma (same
  // pattern already fixed in deals, tickets, and tasks services).
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.companyId !== undefined) updateData.companyId = data.companyId;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.leadScore !== undefined) updateData.leadScore = data.leadScore;
  if (data.leadHeat !== undefined) updateData.leadHeat = data.leadHeat;
  if (data.nextFollowUpDate !== undefined) {
    updateData.nextFollowUpDate = data.nextFollowUpDate
      ? new Date(data.nextFollowUpDate)
      : null;
  }

  // Only stamp lastActivityAt when a meaningful CRM event occurs, not on
  // trivial data edits (phone/email/position fixes). Status/score changes
  // represent actual sales progression and warrant an activity stamp.
  const isSignificantChange =
    (data.status !== undefined && data.status !== existing.status) ||
    (data.leadScore !== undefined && data.leadScore !== existing.leadScore) ||
    (data.leadHeat !== undefined && data.leadHeat !== existing.leadHeat);

  if (isSignificantChange) {
    updateData.lastActivityAt = new Date();
  }

  // Use updateMany with workspaceId for defense-in-depth (prevents a TOCTOU
  // gap between the findFirst check and the actual write), then re-fetch.
  // Same pattern already applied to deals, tickets, and tasks services.
  const updateResult = await prisma.contact.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: updateData,
  });
  if (updateResult.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }
  const updated = await prisma.contact.findFirstOrThrow({
    where: { id, workspaceId, deletedAt: null },
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
  // Soft delete — stamps deletedAt so the row can be restored. Activities,
  // tasks, deals, and tickets keep their FK to the contact so timeline stays
  // intact for audit; those relations continue to work since deletedAt doesn't
  // affect FK integrity, only list/read queries that opt to hide tombstones.
  const result = await prisma.contact.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }
  return { deleted: true };
}

export async function duplicate(
  workspaceId: string,
  memberId: string,
  id: string,
) {
  // Fetch source contact with tag relations so we can replicate them on the copy
  const source = await prisma.contact.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: { tags: { select: { tagId: true } } },
  });
  if (!source) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  // Suffix lastName so the "(העתק)" marker still appears at the end of fullName
  // (UI composes `${firstName} ${lastName}`). Tags are replicated via nested
  // create so the copy carries the same classification as the original.
  const created = await prisma.contact.create({
    data: {
      workspaceId,
      createdById: memberId,
      firstName: source.firstName,
      lastName: `${source.lastName} (העתק)`,
      email: source.email,
      phone: source.phone,
      companyId: source.companyId,
      position: source.position,
      source: source.source,
      status: source.status,
      tags:
        source.tags.length > 0
          ? {
              create: source.tags.map((t) => ({ tagId: t.tagId })),
            }
          : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  return created;
}

export async function restore(workspaceId: string, id: string) {
  // Restore a soft-deleted contact by clearing deletedAt. Only matches rows
  // where deletedAt IS NOT NULL to distinguish "not deleted" from "not found".
  const result = await prisma.contact.updateMany({
    where: { id, workspaceId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Deleted contact not found");
  }
  return { restored: true };
}

export async function getTimeline(workspaceId: string, contactId: string) {
  // Verify contact belongs to workspace (return 404 instead of silent empty results)
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId, deletedAt: null },
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
      where: { workspaceId, contactId, deletedAt: null },
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
    where: { workspaceId, deletedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "asc" },
    take: BOARD_MAX_ITEMS,
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
