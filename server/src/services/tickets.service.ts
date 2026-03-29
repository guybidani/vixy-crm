import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";
import { calculateUrgency } from "../utils/urgency.util";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  contactId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

const SORTABLE_FIELDS = [
  "subject",
  "status",
  "priority",
  "createdAt",
  "updatedAt",
  "resolvedAt",
] as const;

export async function list(params: ListParams) {
  const {
    workspaceId,
    page = 1,
    limit = 50,
    search,
    status,
    priority,
    assigneeId,
    contactId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.TicketWhereInput = { workspaceId };

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { contact: { OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ] } },
    ];
  }
  if (status) {
    // Support comma-separated multi-status filter e.g. "RESOLVED,CLOSED"
    const statusValues = status.split(",").map((s) => s.trim()).filter(Boolean);
    if (statusValues.length === 1) {
      where.status = statusValues[0] as any;
    } else if (statusValues.length > 1) {
      where.status = { in: statusValues as any[] };
    }
  }
  if (priority) where.priority = priority as any;
  if (assigneeId) where.assigneeId = assigneeId;
  if (contactId) where.contactId = contactId;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { include: { user: { select: { name: true } } } },
        slaPolicy: true,
        _count: { select: { messages: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    data: tickets.map((t) => {
      const urgency = calculateUrgency(
        {
          priority: t.priority,
          createdAt: t.createdAt,
          firstResponseAt: t.firstResponseAt,
          resolvedAt: t.resolvedAt,
          status: t.status,
        },
        t.slaPolicy
          ? {
              firstResponseMinutes: t.slaPolicy.firstResponseMinutes,
              resolutionMinutes: t.slaPolicy.resolutionMinutes,
            }
          : null,
      );

      return {
        id: t.id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        channel: t.channel,
        contact: t.contact
          ? {
              id: t.contact.id,
              name: `${t.contact.firstName} ${t.contact.lastName}`,
            }
          : null,
        assignee: t.assignee
          ? { id: t.assignee.id, name: t.assignee.user.name }
          : null,
        slaPolicy: t.slaPolicy
          ? {
              id: t.slaPolicy.id,
              name: t.slaPolicy.name,
              firstResponseMinutes: t.slaPolicy.firstResponseMinutes,
              resolutionMinutes: t.slaPolicy.resolutionMinutes,
            }
          : null,
        urgencyLevel: t.urgencyLevel,
        urgencyScore: urgency.score,
        urgencyComputed: urgency,
        firstResponseAt: t.firstResponseAt,
        resolvedAt: t.resolvedAt,
        csatScore: t.csatScore,
        messageCount: t._count.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getById(workspaceId: string, id: string) {
  const ticket = await prisma.ticket.findFirst({
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
      assignee: { include: { user: { select: { name: true } } } },
      slaPolicy: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

  const urgency = calculateUrgency(
    {
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      status: ticket.status,
    },
    ticket.slaPolicy
      ? {
          firstResponseMinutes: ticket.slaPolicy.firstResponseMinutes,
          resolutionMinutes: ticket.slaPolicy.resolutionMinutes,
        }
      : null,
  );

  return { ...ticket, urgencyScore: urgency.score, urgencyComputed: urgency };
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    subject: string;
    description?: string;
    priority?: string;
    urgencyLevel?: string;
    channel?: string;
    contactId?: string;
    assigneeId?: string;
  },
) {
  // Find default SLA policy
  const defaultSla = await prisma.slaPolicy.findFirst({
    where: { workspaceId, isDefault: true },
  });

  const ticket = await prisma.ticket.create({
    data: {
      workspaceId,
      subject: data.subject,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      urgencyLevel: (data.urgencyLevel as any) || "MEDIUM",
      channel: data.channel || "email",
      contactId: data.contactId,
      assigneeId: data.assigneeId,
      slaPolicyId: defaultSla?.id,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignee: { include: { user: { select: { name: true } } } },
    },
  });

  enqueueAutomationTrigger({
    workspaceId,
    trigger: "TICKET_CREATED",
    entityType: "ticket",
    entityId: ticket.id,
    data: {
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status,
      channel: ticket.channel,
    },
  }).catch(() => {});

  return ticket;
}

export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    subject: string;
    description: string;
    status: string;
    priority: string;
    urgencyLevel: string;
    assigneeId: string;
  }>,
) {
  const existing = await prisma.ticket.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Ticket not found");

  const updateData: any = { ...data };
  if (data.status) updateData.status = data.status;
  if (data.priority) updateData.priority = data.priority;

  // Set resolvedAt when status changes to RESOLVED
  if (data.status === "RESOLVED" && existing.status !== "RESOLVED") {
    updateData.resolvedAt = new Date();
  }
  // Clear resolvedAt when ticket is re-opened from RESOLVED state
  if (
    data.status &&
    data.status !== "RESOLVED" &&
    data.status !== "CLOSED" &&
    existing.status === "RESOLVED"
  ) {
    updateData.resolvedAt = null;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignee: { include: { user: { select: { name: true } } } },
    },
  });

  if (data.status && data.status !== existing.status) {
    enqueueAutomationTrigger({
      workspaceId,
      trigger: "TICKET_STATUS_CHANGED",
      entityType: "ticket",
      entityId: id,
      data: {
        subject: updated.subject,
        status: updated.status,
        priority: updated.priority,
      },
      previousData: { status: existing.status },
    }).catch(() => {});
  }

  return updated;
}

export async function addMessage(
  workspaceId: string,
  ticketId: string,
  data: {
    body: string;
    senderType: string;
    senderId: string;
    isInternal?: boolean;
  },
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, workspaceId },
  });
  if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      body: data.body,
      senderType: data.senderType,
      senderId: data.senderId,
      isInternal: data.isInternal || false,
    },
  });

  // Consolidate all ticket side-effects into a single update (avoid N+2 queries)
  if (data.senderType === "agent") {
    const ticketUpdates: any = {};
    const isFirstResponse = !ticket.firstResponseAt;
    const isNewToOpen = ticket.status === "NEW";

    if (isFirstResponse) ticketUpdates.firstResponseAt = new Date();
    if (isNewToOpen) ticketUpdates.status = "OPEN";

    if (Object.keys(ticketUpdates).length > 0) {
      await prisma.ticket.update({ where: { id: ticketId }, data: ticketUpdates });

      // Fire automation trigger when ticket auto-transitions NEW → OPEN
      if (isNewToOpen) {
        enqueueAutomationTrigger({
          workspaceId,
          trigger: "TICKET_STATUS_CHANGED",
          entityType: "ticket",
          entityId: ticketId,
          data: {
            subject: ticket.subject,
            status: "OPEN",
            priority: ticket.priority,
          },
          previousData: { status: "NEW" },
        }).catch(() => {});
      }
    }
  }

  return message;
}

export async function getMessages(workspaceId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, workspaceId },
  });
  if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found");

  return prisma.ticketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
}

export async function board(workspaceId: string) {
  const tickets = await prisma.ticket.findMany({
    where: { workspaceId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignee: { include: { user: { select: { name: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const statuses = ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"];
  const grouped: Record<string, any[]> = {};
  for (const s of statuses) grouped[s] = [];

  for (const t of tickets) {
    const urgency = calculateUrgency(
      {
        priority: t.priority,
        createdAt: t.createdAt,
        firstResponseAt: t.firstResponseAt,
        resolvedAt: t.resolvedAt,
        status: t.status,
      },
      null, // board doesn't include slaPolicy
    );

    grouped[t.status]?.push({
      id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      channel: t.channel,
      contact: t.contact
        ? {
            id: t.contact.id,
            name: `${t.contact.firstName} ${t.contact.lastName}`,
          }
        : null,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.user.name }
        : null,
      messageCount: t._count.messages,
      urgencyScore: urgency.score,
      urgencyComputed: urgency,
      firstResponseAt: t.firstResponseAt,
      resolvedAt: t.resolvedAt,
      createdAt: t.createdAt,
    });
  }

  const totals = statuses.map((s) => ({
    status: s,
    count: grouped[s].length,
  }));

  return { statuses: grouped, totals };
}
