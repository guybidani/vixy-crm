import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { enqueueAutomationTrigger } from "../queue/automation.queue";
import * as notificationService from "./notification.service";
import { maybeSyncTask } from "./calendar.service";
import {
  scheduleTaskReminder,
  cancelTaskReminder,
} from "../queue/reminder.queue";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  status?: string;
  taskType?: string;
  assigneeId?: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  dueTodayOnly?: boolean;
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
    taskType,
    assigneeId,
    contactId,
    dealId,
    ticketId,
    dueTodayOnly,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.TaskWhereInput = { workspaceId };

  if (status) where.status = status as any;
  if (taskType) where.taskType = taskType as any;
  if (assigneeId) where.assigneeId = assigneeId;
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;
  if (ticketId) where.ticketId = ticketId;
  if (dueTodayOnly) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  }

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
      taskType: t.taskType,
      dueDate: t.dueDate,
      dueTime: t.dueTime,
      reminderMinutes: t.reminderMinutes,
      outcomeNote: t.outcomeNote,
      callResult: (t as any).callResult ?? null,
      snoozedUntil: (t as any).snoozedUntil ?? null,
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

export async function getById(workspaceId: string, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, workspaceId },
    include: {
      assignee: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
      ticket: { select: { id: true, subject: true } },
      createdBy: { include: { user: { select: { name: true } } } },
    },
  });
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    taskType: task.taskType,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    reminderMinutes: task.reminderMinutes,
    outcomeNote: task.outcomeNote,
    callResult: (task as any).callResult ?? null,
    snoozedUntil: (task as any).snoozedUntil ?? null,
    assignee: task.assignee
      ? { id: task.assignee.id, name: task.assignee.user.name }
      : null,
    contact: task.contact
      ? {
          id: task.contact.id,
          name: `${task.contact.firstName} ${task.contact.lastName}`,
        }
      : null,
    deal: task.deal,
    ticket: task.ticket,
    createdBy: task.createdBy.user.name,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    taskType?: string;
    dueDate?: string;
    dueTime?: string;
    reminderMinutes?: number;
    contactId?: string;
    dealId?: string;
    ticketId?: string;
    assigneeId?: string;
  },
) {
  const effectiveAssigneeId = data.assigneeId || memberId;

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title: data.title,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      taskType: (data.taskType as any) || "TASK",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      dueTime: data.dueTime,
      reminderMinutes: data.reminderMinutes ?? 15,
      contactId: data.contactId,
      dealId: data.dealId,
      ticketId: data.ticketId,
      assigneeId: effectiveAssigneeId,
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

  // Notify assignee (if different from creator)
  if (effectiveAssigneeId !== memberId) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: { id: effectiveAssigneeId },
    });
    if (assignee) {
      notificationService
        .create({
          workspaceId,
          userId: assignee.userId,
          type: "TASK_ASSIGNED",
          title: `משימה חדשה הוקצתה אליך: "${task.title}"`,
          entityType: "task",
          entityId: task.id,
        })
        .catch(() => {});
    }
  }

  // Sync to Google Calendar (fire-and-forget)
  maybeSyncTask(workspaceId, task.assigneeId, task).catch(() => {});

  // Schedule BullMQ reminder if dueDate + dueTime are set
  if (data.dueDate && data.dueTime) {
    scheduleTaskReminder(
      task.id,
      workspaceId,
      effectiveAssigneeId,
      task.title,
      new Date(data.dueDate),
      data.dueTime,
      data.reminderMinutes ?? 15,
    ).catch(() => {});
  }

  // Due date notifications (same-day alert)
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNorm = new Date(dueDate);
    dueDateNorm.setHours(0, 0, 0, 0);

    if (dueDateNorm.getTime() === today.getTime()) {
      const assignee = task.assignee
        ? await prisma.workspaceMember.findUnique({
            where: { id: task.assigneeId },
          })
        : null;
      if (assignee) {
        notificationService
          .create({
            workspaceId,
            userId: assignee.userId,
            type: "TASK_DUE",
            title: `המשימה "${task.title}" מתבצעת היום`,
            entityType: "task",
            entityId: task.id,
          })
          .catch(() => {});
      }
    }
  }

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
    taskType: string;
    dueDate: string;
    dueTime: string | null;
    reminderMinutes: number;
    assigneeId: string;
    outcomeNote: string;
    callResult: string | null;
    snoozedUntil: string | null;
  }>,
) {
  const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");

  const updateData: any = { ...data };
  if (data.status) updateData.status = data.status;
  if (data.priority) updateData.priority = data.priority;
  if (data.taskType) updateData.taskType = data.taskType;
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.dueTime === null) updateData.dueTime = null;
  if (data.snoozedUntil) updateData.snoozedUntil = new Date(data.snoozedUntil);
  if (data.snoozedUntil === null) updateData.snoozedUntil = null;
  if (data.callResult === null) updateData.callResult = null;
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

  // Notify new assignee on reassignment
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    const newAssignee = await prisma.workspaceMember.findUnique({
      where: { id: data.assigneeId },
    });
    if (newAssignee) {
      notificationService
        .create({
          workspaceId,
          userId: newAssignee.userId,
          type: "TASK_ASSIGNED",
          title: `משימה הוקצתה אליך: "${updated.title}"`,
          entityType: "task",
          entityId: id,
        })
        .catch(() => {});
    }
  }

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

    // Task completed → cancel any pending reminder
    cancelTaskReminder(id).catch(() => {});

    // Auto-create activity on task completion (linked to contact/deal)
    if (updated.contactId || updated.dealId) {
      const memberId = updated.assigneeId;
      prisma.activity
        .create({
          data: {
            workspaceId,
            memberId,
            type: updated.taskType === "CALL" ? "CALL" : updated.taskType === "MEETING" ? "MEETING" : "NOTE",
            subject: `משימה הושלמה: ${updated.title}`,
            body: (updated as any).outcomeNote || undefined,
            contactId: updated.contactId,
            dealId: updated.dealId,
            metadata: {
              source: "task_completion",
              taskId: id,
              callResult: (updated as any).callResult ?? undefined,
            },
          },
        })
        .catch(() => {});
    }
  }

  // Sync to Google Calendar (fire-and-forget)
  maybeSyncTask(workspaceId, updated.assigneeId, updated).catch(() => {});

  // Re-schedule reminder whenever dueDate, dueTime, or reminderMinutes change
  const effectiveDueDate = data.dueDate
    ? new Date(data.dueDate)
    : existing.dueDate;
  const effectiveDueTime = data.dueTime ?? existing.dueTime;
  const effectiveReminderMinutes =
    data.reminderMinutes ?? existing.reminderMinutes ?? 15;

  if (effectiveDueDate && effectiveDueTime) {
    scheduleTaskReminder(
      id,
      workspaceId,
      updated.assigneeId,
      updated.title,
      effectiveDueDate,
      effectiveDueTime,
      effectiveReminderMinutes,
    ).catch(() => {});
  } else if (!effectiveDueDate || !effectiveDueTime) {
    // dueTime was cleared – cancel any existing reminder
    cancelTaskReminder(id).catch(() => {});
  }

  // Due date notification when due date is updated
  if (data.dueDate && data.dueDate !== existing.dueDate?.toISOString()) {
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNorm = new Date(dueDate);
    dueDateNorm.setHours(0, 0, 0, 0);

    if (dueDateNorm.getTime() === today.getTime()) {
      const assignee = updated.assignee
        ? await prisma.workspaceMember.findUnique({
            where: { id: updated.assigneeId },
          })
        : null;
      if (assignee) {
        notificationService
          .create({
            workspaceId,
            userId: assignee.userId,
            type: "TASK_DUE",
            title: `המשימה "${updated.title}" מתבצעת היום`,
            entityType: "task",
            entityId: id,
          })
          .catch(() => {});
      }
    }
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

/**
 * Find all overdue incomplete tasks and create notifications for assignees.
 */
export async function checkOverdueTasks(workspaceId: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdueTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      status: { notIn: ["DONE", "CANCELLED"] },
      dueDate: { lt: now },
    },
    include: {
      assignee: { select: { id: true, userId: true } },
    },
  });

  // Create notifications for each overdue task assignee
  for (const task of overdueTasks) {
    if (task.assignee) {
      await notificationService
        .create({
          workspaceId,
          userId: task.assignee.userId,
          type: "TASK_DUE",
          title: `המשימה "${task.title}" באיחור!`,
          entityType: "task",
          entityId: task.id,
        })
        .catch(() => {});
    }
  }

  return overdueTasks;
}

/**
 * Get task statistics for dashboard - overdue, due today, completed this week.
 */
export async function getStats(workspaceId: string, memberId?: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere: Prisma.TaskWhereInput = { workspaceId };
  if (memberId) baseWhere.assigneeId = memberId;

  const [overdueCount, dueTodayCount, completedThisWeek] = await Promise.all([
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lt: todayStart },
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: "DONE",
        completedAt: { gte: weekAgo },
      },
    }),
  ]);

  return { overdueCount, dueTodayCount, completedThisWeek };
}
