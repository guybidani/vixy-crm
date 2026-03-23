import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { calculateScoreDelta } from "../utils/scoring.util";

interface ListParams {
  workspaceId: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  limit?: number;
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

  // Step 2: Fetch contact details
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  });

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Step 3: Fetch the most recent activity per contact to get type & subject
  const lastActivities = await prisma.activity.findMany({
    where: {
      workspaceId,
      memberId,
      type: { in: ["CALL", "EMAIL", "MEETING", "WHATSAPP"] },
      contactId: { in: contactIds },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["contactId"],
    select: { contactId: true, type: true, subject: true, createdAt: true },
  });

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
  const { workspaceId, contactId, dealId, ticketId, limit = 50 } = params;

  const where: any = { workspaceId };
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;
  if (ticketId) where.ticketId = ticketId;

  return prisma.activity.findMany({
    where,
    include: {
      member: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
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
  // Verify foreign key references belong to this workspace
  if (data.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: data.contactId, workspaceId } });
    if (!contact) throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");
  }
  if (data.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: data.dealId, workspaceId } });
    if (!deal) throw new AppError(400, "INVALID_REFERENCE", "Deal not found in workspace");
  }
  if (data.ticketId) {
    const ticket = await prisma.ticket.findFirst({ where: { id: data.ticketId, workspaceId } });
    if (!ticket) throw new AppError(400, "INVALID_REFERENCE", "Ticket not found in workspace");
  }

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

  // Fire-and-forget: update contact lead score + lastActivityAt
  if (data.contactId) {
    const delta = calculateScoreDelta(data.type);
    prisma.contact
      .updateMany({
        where: { id: data.contactId, workspaceId },
        data: {
          ...(delta !== 0 && { leadScore: { increment: delta } }),
          lastActivityAt: new Date(),
        },
      })
      .then(async () => {
        // Clamp leadScore to 0-100 if it went out of bounds
        const contact = await prisma.contact.findFirst({ where: { id: data.contactId!, workspaceId } });
        if (contact && (contact.leadScore > 100 || contact.leadScore < 0)) {
          const clamped = Math.min(100, Math.max(0, contact.leadScore));
          return prisma.contact.updateMany({
            where: { id: data.contactId!, workspaceId },
            data: { leadScore: clamped },
          });
        }
      })
      .catch(() => {
        // Silently ignore — don't block activity creation
      });
  }

  return activity;
}
