import { prisma } from "../db/client";
import { calculateScoreDelta } from "../utils/scoring.util";

interface ListParams {
  workspaceId: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  limit?: number;
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
      .update({
        where: { id: data.contactId },
        data: {
          ...(delta !== 0 && { leadScore: { increment: delta } }),
          lastActivityAt: new Date(),
        },
      })
      .then((updated) => {
        // Clamp leadScore to 0-100 if it went out of bounds
        if (updated.leadScore > 100 || updated.leadScore < 0) {
          const clamped = Math.min(100, Math.max(0, updated.leadScore));
          return prisma.contact.update({
            where: { id: data.contactId! },
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
