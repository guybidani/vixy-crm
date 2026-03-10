import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  status?: string;
  assigneeId?: string;
  contactId?: string;
  dealId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

const SORTABLE_FIELDS = [
  "title",
  "status",
  "priority",
  "dueDate",
  "createdAt",
  "updatedAt",
] as const;

export async function list(params: ListParams) {
  const {
    workspaceId,
    page = 1,
    limit = 50,
    status,
    assigneeId,
    contactId,
    dealId,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.TaskWhereInput = { workspaceId };

  if (status) where.status = status as any;
  if (assigneeId) where.assigneeId = assigneeId;
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignee: { include: { user: { select: { name: true } } } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        createdBy: { include: { user: { select: { name: true } } } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    data: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.user.name }
        : null,
      contact: t.contact
        ? {
            id: t.contact.id,
            name: `${t.contact.firstName} ${t.contact.lastName}`,
          }
        : null,
      deal: t.deal,
      createdBy: t.createdBy.user.name,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    contactId?: string;
    dealId?: string;
    ticketId?: string;
    assigneeId?: string;
  },
) {
  const task = await prisma.task.create({
    data: {
      workspaceId,
      title: data.title,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      contactId: data.contactId,
      dealId: data.dealId,
      ticketId: data.ticketId,
      assigneeId: data.assigneeId || memberId,
      createdById: memberId,
    },
    include: {
      assignee: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  enqueueAutomationTrigger({
    workspaceId,
    trigger: "TASK_CREATED",
    entityType: "task",
    entityId: task.id,
    data: { title: task.title, priority: task.priority, status: task.status },
  }).catch(() => {});

  return task;
}

export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assigneeId: string;
  }>,
) {
  const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");

  const updateData: any = { ...data };
  if (data.status) updateData.status = data.status;
  if (data.priority) updateData.priority = data.priority;
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.status === "DONE" && existing.status !== "DONE") {
    updateData.completedAt = new Date();
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  if (data.status === "DONE" && existing.status !== "DONE") {
    enqueueAutomationTrigger({
      workspaceId,
      trigger: "TASK_COMPLETED",
      entityType: "task",
      entityId: id,
      data: {
        title: updated.title,
        priority: updated.priority,
        status: updated.status,
      },
      previousData: { status: existing.status },
    }).catch(() => {});
  }

  return updated;
}

export async function remove(workspaceId: string, id: string) {
  const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");
  return prisma.task.delete({ where: { id } });
}

export async function board(workspaceId: string) {
  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    include: {
      assignee: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
  const grouped: Record<string, any[]> = {};
  for (const s of statuses) grouped[s] = [];

  for (const t of tasks) {
    grouped[t.status]?.push({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.user.name }
        : null,
      contact: t.contact
        ? {
            id: t.contact.id,
            name: `${t.contact.firstName} ${t.contact.lastName}`,
          }
        : null,
      deal: t.deal,
      createdAt: t.createdAt,
    });
  }

  const totals = statuses.map((s) => ({
    status: s,
    count: grouped[s].length,
  }));

  return { statuses: grouped, totals };
}
