import { prisma } from "../db/client";

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
  return prisma.activity.create({
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
}
