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
import { SEVEN_DAYS_MS, BOARD_MAX_ITEMS } from "../lib/constants";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  taskType?: string;
  taskContext?: string;
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
    page: rawPage = 1,
    limit: rawLimit = 50,
    search,
    status,
    priority,
    taskType,
    taskContext,
    assigneeId,
    contactId,
    dealId,
    ticketId,
    dueTodayOnly,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  // Clamp page/limit to valid positive ranges — negative page causes negative
  // skip (Prisma error), and limit<=0 silently returns empty results.
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 500);
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.TaskWhereInput = { workspaceId };

  if (search) {
    // Sanitize LIKE wildcards so user input like "%" or "_" doesn't match
    // everything.  Prisma's `contains` maps to SQL LIKE '%…%' — percent and
    // underscore would be interpreted as wildcards without escaping.
    const safeSearch = search.replace(/[%_]/g, "\\$&");
    where.title = { contains: safeSearch, mode: "insensitive" };
  }
  if (status) where.status = status as any;
  if (priority) where.priority = priority as any;
  if (taskType) where.taskType = taskType as any;
  if (taskContext) where.taskContext = taskContext as any;
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
      taskContext: t.taskContext,
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
      isRecurring: t.isRecurring,
      recurrenceType: t.recurrenceType,
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
    taskContext: task.taskContext,
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
    taskContext?: string;
    dueDate?: string;
    dueTime?: string;
    reminderMinutes?: number;
    contactId?: string;
    dealId?: string;
    ticketId?: string;
    assigneeId?: string;
    isRecurring?: boolean;
    recurrenceType?: string;
    recurrenceDay?: number;
    recurrenceEndDate?: string;
  },
) {
  // Verify all foreign key references in parallel — independent queries
  const [contact, deal, ticket, assigneeMember] = await Promise.all([
    data.contactId
      ? prisma.contact.findFirst({ where: { id: data.contactId, workspaceId }, select: { id: true } })
      : null,
    data.dealId
      ? prisma.deal.findFirst({ where: { id: data.dealId, workspaceId }, select: { id: true } })
      : null,
    data.ticketId
      ? prisma.ticket.findFirst({ where: { id: data.ticketId, workspaceId }, select: { id: true } })
      : null,
    data.assigneeId
      ? prisma.workspaceMember.findFirst({ where: { id: data.assigneeId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (data.contactId && !contact)
    throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");
  if (data.dealId && !deal)
    throw new AppError(400, "INVALID_REFERENCE", "Deal not found in workspace");
  if (data.ticketId && !ticket)
    throw new AppError(400, "INVALID_REFERENCE", "Ticket not found in workspace");
  if (data.assigneeId && !assigneeMember)
    throw new AppError(400, "INVALID_REFERENCE", "Assignee not found in workspace");

  const effectiveAssigneeId = data.assigneeId || memberId;

  // Auto-detect task context: deal → SALES, ticket → SERVICE, otherwise use provided or GENERAL
  const effectiveTaskContext = data.taskContext
    ? data.taskContext
    : data.dealId
      ? "SALES"
      : data.ticketId
        ? "SERVICE"
        : "GENERAL";

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title: data.title,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      taskType: (data.taskType as any) || "TASK",
      taskContext: effectiveTaskContext as any,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      dueTime: data.dueTime,
      reminderMinutes: data.reminderMinutes ?? 15,
      contactId: data.contactId,
      dealId: data.dealId,
      ticketId: data.ticketId,
      assigneeId: effectiveAssigneeId,
      createdById: memberId,
      isRecurring: data.isRecurring ?? false,
      recurrenceType: data.isRecurring ? data.recurrenceType : undefined,
      recurrenceDay: data.isRecurring ? data.recurrenceDay : undefined,
      recurrenceEndDate: data.isRecurring && data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
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
  // task.assignee is already fetched in the create include — no extra DB query needed
  if (effectiveAssigneeId !== memberId && task.assignee) {
    notificationService
      .create({
        workspaceId,
        userId: task.assignee.userId,
        type: "TASK_ASSIGNED",
        title: `משימה חדשה הוקצתה אליך: "${task.title}"`,
        entityType: "task",
        entityId: task.id,
      })
      .catch(() => {});
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

    if (dueDateNorm.getTime() === today.getTime() && task.assignee) {
      // task.assignee is already included in the create response — no extra DB query needed
      notificationService
        .create({
          workspaceId,
          userId: task.assignee.userId,
          type: "TASK_DUE",
          title: `המשימה "${task.title}" מתבצעת היום`,
          entityType: "task",
          entityId: task.id,
        })
        .catch(() => {});
    }
  }

  return task;
}

/**
 * When a recurring task is marked DONE, create the next occurrence.
 */
export async function createNextRecurrence(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId } });
  if (!task || !task.isRecurring || !task.recurrenceType) return null;

  // Don't create if recurrence end date has passed
  if (task.recurrenceEndDate && new Date() > task.recurrenceEndDate) return null;

  // Calculate next due date based on current task's dueDate
  const baseDueDate = task.dueDate ? new Date(task.dueDate) : new Date();
  let nextDueDate: Date;

  switch (task.recurrenceType) {
    case "DAILY":
      nextDueDate = new Date(baseDueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      break;
    case "WEEKLY":
      nextDueDate = new Date(baseDueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 7);
      break;
    case "BIWEEKLY":
      nextDueDate = new Date(baseDueDate);
      nextDueDate.setDate(nextDueDate.getDate() + 14);
      break;
    case "MONTHLY":
      nextDueDate = new Date(baseDueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    default:
      return null;
  }

  // Don't create if next due date is past the end date
  if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) return null;

  // The parent is either the task's own parent (if it's a child) or the task itself
  const parentId = task.parentTaskId || task.id;

  const nextTask = await prisma.task.create({
    data: {
      workspaceId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      taskType: task.taskType,
      taskContext: task.taskContext,
      assigneeId: task.assigneeId,
      createdById: task.createdById,
      contactId: task.contactId,
      dealId: task.dealId,
      ticketId: task.ticketId,
      dueDate: nextDueDate,
      dueTime: task.dueTime,
      reminderMinutes: task.reminderMinutes,
      isRecurring: true,
      recurrenceType: task.recurrenceType,
      recurrenceDay: task.recurrenceDay,
      recurrenceEndDate: task.recurrenceEndDate,
      parentTaskId: parentId,
    },
  });

  // Schedule reminder for the new task if applicable
  if (nextTask.dueDate && nextTask.dueTime) {
    scheduleTaskReminder(
      nextTask.id,
      workspaceId,
      nextTask.assigneeId,
      nextTask.title,
      nextTask.dueDate,
      nextTask.dueTime,
      nextTask.reminderMinutes ?? 15,
    ).catch(() => {});
  }

  return nextTask;
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
    taskContext: string;
    dueDate: string;
    dueTime: string | null;
    reminderMinutes: number;
    assigneeId: string | null;
    outcomeNote: string;
    callResult: string | null;
    snoozedUntil: string | null;
    isRecurring: boolean;
    recurrenceType: string;
    recurrenceDay: number;
    recurrenceEndDate: string;
  }>,
) {
  // Fetch task and validate assigneeId ownership in parallel
  const [existing, assigneeRef] = await Promise.all([
    prisma.task.findFirst({ where: { id, workspaceId } }),
    data.assigneeId
      ? prisma.workspaceMember.findFirst({ where: { id: data.assigneeId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");
  if (data.assigneeId && !assigneeRef)
    throw new AppError(400, "INVALID_REFERENCE", "Assignee not found in workspace");

  // Build updateData from explicit fields instead of spreading { ...data }.
  // Blind spread passes raw string values (dueDate, snoozedUntil, etc.) directly
  // to Prisma, relying on auto-coercion. Explicit mapping ensures proper Date
  // conversion and makes it clear which columns are written.
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.taskType !== undefined) updateData.taskType = data.taskType;
  if (data.taskContext !== undefined) updateData.taskContext = data.taskContext;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
  if (data.outcomeNote !== undefined) updateData.outcomeNote = data.outcomeNote;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
  if (data.recurrenceType !== undefined) updateData.recurrenceType = data.recurrenceType;
  if (data.recurrenceDay !== undefined) updateData.recurrenceDay = data.recurrenceDay;
  if (data.reminderMinutes !== undefined) updateData.reminderMinutes = data.reminderMinutes;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
  if (data.snoozedUntil !== undefined) updateData.snoozedUntil = data.snoozedUntil ? new Date(data.snoozedUntil) : null;
  if (data.callResult !== undefined) updateData.callResult = data.callResult;
  if (data.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
  if (data.status === "DONE" && existing.status !== "DONE") {
    updateData.completedAt = new Date();
  } else if (data.status && data.status !== "DONE" && existing.status === "DONE") {
    // Reactivating a previously completed task — clear the completion timestamp
    updateData.completedAt = null;
  }

  // Use updateMany with workspaceId for defense-in-depth (prevents a TOCTOU
  // gap between the findFirst check and the actual write), then re-fetch.
  const updateResult = await prisma.task.updateMany({
    where: { id, workspaceId },
    data: updateData,
  });
  if (updateResult.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }
  const updated = await prisma.task.findFirstOrThrow({
    where: { id, workspaceId },
    include: {
      assignee: { include: { user: { select: { name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  // Notify new assignee on reassignment
  // updated.assignee reflects the new assignee after the update — no extra DB query needed
  if (data.assigneeId && data.assigneeId !== existing.assigneeId && updated.assignee) {
    notificationService
      .create({
        workspaceId,
        userId: updated.assignee.userId,
        type: "TASK_ASSIGNED",
        title: `משימה הוקצתה אליך: "${updated.title}"`,
        entityType: "task",
        entityId: id,
      })
      .catch(() => {});
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

    // Auto-create next recurrence if recurring
    if (existing.isRecurring) {
      createNextRecurrence(id, workspaceId).catch(() => {});
    }

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

    if (dueDateNorm.getTime() === today.getTime() && updated.assignee) {
      // updated.assignee is already included in the update response — no extra DB query needed
      notificationService
        .create({
          workspaceId,
          userId: updated.assignee.userId,
          type: "TASK_DUE",
          title: `המשימה "${updated.title}" מתבצעת היום`,
          entityType: "task",
          entityId: id,
        })
        .catch(() => {});
    }
  }

  return updated;
}

export async function remove(workspaceId: string, id: string) {
  // Single round-trip with workspace-scoped delete (defense-in-depth)
  const result = await prisma.task.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Task not found");
  // Clean up orphaned notes (polymorphic relation, no FK cascade)
  await prisma.note.deleteMany({ where: { workspaceId, entityType: "task", entityId: id } });
  return { deleted: true };
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
    take: BOARD_MAX_ITEMS,
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
      taskContext: t.taskContext,
      dueDate: t.dueDate,
      isRecurring: t.isRecurring,
      recurrenceType: t.recurrenceType,
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

  // Cap at 500 to prevent unbounded result sets for workspaces with many
  // overdue tasks. Notifications are created in bulk via createMany so a
  // single batch of 500 is already generous for a periodic check.
  const overdueTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      status: { notIn: ["DONE", "CANCELLED"] },
      dueDate: { lt: now },
    },
    include: {
      assignee: { select: { id: true, userId: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 500,
  });

  // Bulk-create notifications instead of sequential awaits in a loop
  const notificationData = overdueTasks
    .filter((task) => task.assignee)
    .map((task) => ({
      workspaceId,
      userId: task.assignee!.userId,
      type: "TASK_DUE" as const,
      title: `המשימה "${task.title}" באיחור!`,
      entityType: "task",
      entityId: task.id,
    }));

  if (notificationData.length > 0) {
    await prisma.notification.createMany({ data: notificationData }).catch(() => {});
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
  const weekAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

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
