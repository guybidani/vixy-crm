import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { calculateScoreDelta } from "../utils/scoring.util";

interface ListParams {
  workspaceId: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  companyId?: string;
  limit?: number;
  page?: number;
}

export interface RecentContactResult {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  lastActivity: {
    type: string;
    subject: string | null;
    createdAt: Date;
  };
  activityCount: number;
}

/**
 * Returns the N most-recently-interacted-with contacts for a given member.
 * Only real interactions (CALL, EMAIL, MEETING, WHATSAPP) are considered.
 */
export async function getRecentContacts(
  workspaceId: string,
  memberId: string,
  limit = 10,
): Promise<RecentContactResult[]> {
  // Step 1: Get unique contactIds ordered by most recent interaction
  const grouped = await prisma.activity.groupBy({
    by: ["contactId"],
    where: {
      workspaceId,
      memberId,
      type: { in: ["CALL", "EMAIL", "MEETING", "WHATSAPP"] },
      contactId: { not: null },
    },
    _max: { createdAt: true },
    _count: { id: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const contactIds = grouped
    .map((g) => g.contactId)
    .filter((id): id is string => id !== null);

  // Steps 2 & 3: Fetch contact details and last activities in parallel
  const [contacts, lastActivities] = await Promise.all([
    prisma.contact.findMany({
      where: { id: { in: contactIds }, workspaceId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    }),
    prisma.activity.findMany({
      where: {
        workspaceId,
        memberId,
        type: { in: ["CALL", "EMAIL", "MEETING", "WHATSAPP"] },
        contactId: { in: contactIds },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["contactId"],
      select: { contactId: true, type: true, subject: true, createdAt: true },
    }),
  ]);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const lastActivityMap = new Map(
    lastActivities.map((a) => [a.contactId, a]),
  );

  // Step 4: Assemble results in the same order as grouped
  const results: RecentContactResult[] = [];
  for (const g of grouped) {
    const contact = contactMap.get(g.contactId!);
    const lastAct = lastActivityMap.get(g.contactId!);
    if (!contact || !lastAct) continue;

    results.push({
      contact,
      lastActivity: {
        type: lastAct.type as string,
        subject: lastAct.subject,
        createdAt: lastAct.createdAt,
      },
      activityCount: g._count.id,
    });
  }
  return results;
}

export async function list(params: ListParams) {
  const { workspaceId, contactId, dealId, ticketId, companyId, limit: rawLimit = 50, page: rawPage = 1 } = params;
  // Clamp page/limit to valid positive ranges — negative page causes negative
  // skip (Prisma error), and limit<=0 silently returns empty results.
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 100);

  const where: any = { workspaceId };

  // companyId expands to a relational filter — use Prisma relations instead of
  // materializing all contact/deal IDs into the app layer (which was unbounded
  // and could produce huge IN-clause arrays for companies with many entities).
  if (companyId) {
    where.OR = [
      { contact: { companyId } },
      { deal: { companyId } },
    ];
  } else {
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (ticketId) where.ticketId = ticketId;
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true } } } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    data: activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    type: string;
    subject?: string;
    body?: string;
    contactId?: string;
    dealId?: string;
    ticketId?: string;
    metadata?: any;
  },
) {
  // Verify foreign key references belong to this workspace — parallel queries
  const [contactRef, dealRef, ticketRef] = await Promise.all([
    data.contactId
      ? prisma.contact.findFirst({ where: { id: data.contactId, workspaceId }, select: { id: true } })
      : null,
    data.dealId
      ? prisma.deal.findFirst({ where: { id: data.dealId, workspaceId }, select: { id: true } })
      : null,
    data.ticketId
      ? prisma.ticket.findFirst({ where: { id: data.ticketId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (data.contactId && !contactRef)
    throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");
  if (data.dealId && !dealRef)
    throw new AppError(400, "INVALID_REFERENCE", "Deal not found in workspace");
  if (data.ticketId && !ticketRef)
    throw new AppError(400, "INVALID_REFERENCE", "Ticket not found in workspace");

  const activity = await prisma.activity.create({
    data: {
      workspaceId,
      memberId,
      type: data.type as any,
      subject: data.subject,
      body: data.body,
      contactId: data.contactId,
      dealId: data.dealId,
      ticketId: data.ticketId,
      metadata: data.metadata,
    },
    include: {
      member: { include: { user: { select: { name: true } } } },
    },
  });

  // Fire-and-forget: update contact lead score (with clamp) + lastActivityAt.
  // Single raw SQL UPDATE applies the delta and clamps 0-100 in one round-trip,
  // replacing the previous updateMany → findFirst → updateMany (3-query) pattern.
  if (data.contactId) {
    const delta = calculateScoreDelta(data.type);
    prisma.$executeRaw`
      UPDATE "Contact"
      SET
        "leadScore" = GREATEST(0, LEAST(100, "leadScore" + ${delta})),
        "lastActivityAt" = NOW()
      WHERE id = ${data.contactId} AND "workspaceId" = ${workspaceId}
    `.catch(() => {
      // Silently ignore — don't block activity creation
    });
  }

  // Fire-and-forget: stamp lastActivityAt on the linked deal so deal health stays current
  if (data.dealId) {
    prisma.deal
      .updateMany({
        where: { id: data.dealId, workspaceId },
        data: { lastActivityAt: new Date() },
      })
      .catch(() => {
        // Silently ignore — don't block activity creation
      });
  }

  return activity;
}

export async function update(
  workspaceId: string,
  memberId: string,
  activityId: string,
  data: { subject?: string; body?: string; metadata?: any },
) {
  // Verify ownership — only the author can edit
  const existing = await prisma.activity.findFirst({
    where: { id: activityId, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Activity not found");
  if (existing.memberId !== memberId)
    throw new AppError(403, "FORBIDDEN", "Not the author");

  // Build updateData from explicit fields instead of passing raw data object.
  const updateData: Record<string, unknown> = {};
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  // Use updateMany with workspaceId + memberId for defense-in-depth (prevents
  // a TOCTOU gap between the findFirst check and the write — the activity
  // could be deleted or reassigned between the two queries).
  const result = await prisma.activity.updateMany({
    where: { id: activityId, workspaceId, memberId },
    data: updateData,
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Activity not found");
  }

  return prisma.activity.findFirstOrThrow({
    where: { id: activityId, workspaceId },
    include: {
      member: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });
}

export async function remove(
  workspaceId: string,
  memberId: string,
  activityId: string,
) {
  // Use deleteMany with workspaceId + memberId scope in a single round-trip
  // instead of findFirst + delete (two round-trips with TOCTOU race).
  // This also enforces author ownership at the delete level, not just the check.
  const result = await prisma.activity.deleteMany({
    where: { id: activityId, workspaceId, memberId },
  });
  if (result.count === 0) {
    // Distinguish 404 from 403: check if the activity exists but belongs to another member
    const exists = await prisma.activity.findFirst({
      where: { id: activityId, workspaceId },
      select: { id: true },
    });
    if (exists) throw new AppError(403, "FORBIDDEN", "Not the author");
    throw new AppError(404, "NOT_FOUND", "Activity not found");
  }
  return { deleted: true };
}
