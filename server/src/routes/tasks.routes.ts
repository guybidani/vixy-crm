import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import * as tasksService from "../services/tasks.service";
import { prisma } from "../db/client";
import { cancelTaskReminder } from "../queue/reminder.queue";

export const tasksRouter = Router();

const TASK_TYPES = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "FOLLOW_UP", "TASK"] as const;
const TASK_CONTEXTS = ["SALES", "SERVICE", "GENERAL"] as const;

const createSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  taskContext: z.enum(TASK_CONTEXTS).optional(),
  dueDate: z.string().optional(),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "שעה חייבת להיות בפורמט HH:mm")
    .optional(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  recurrenceDay: z.number().min(0).max(31).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  taskContext: z.enum(TASK_CONTEXTS).optional(),
  dueDate: z.string().optional(),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "שעה חייבת להיות בפורמט HH:mm")
    .optional()
    .nullable(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
  assigneeId: z.string().uuid().optional(),
  outcomeNote: z.string().optional(),
  callResult: z.enum(["ANSWERED","VOICEMAIL","NO_ANSWER","BUSY","RESCHEDULED","NOT_RELEVANT"]).optional().nullable(),
  snoozedUntil: z.string().datetime().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  recurrenceDay: z.number().min(0).max(31).optional(),
  recurrenceEndDate: z.string().datetime().optional(),
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    // "myOnly" filter: resolve current member's ID
    let myAssigneeId = req.query.assigneeId as string | undefined;
    if (req.query.myOnly === "true") {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
      });
      if (member) myAssigneeId = member.id;
    }

    const result = await tasksService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 50, 500),
      search: (req.query.search as string) || undefined,
      status: req.query.status as string,
      taskType: req.query.taskType as string,
      taskContext: req.query.taskContext as string,
      assigneeId: myAssigneeId,
      contactId: req.query.contactId as string,
      dealId: req.query.dealId as string,
      ticketId: req.query.ticketId as string,
      dueTodayOnly: req.query.dueTodayOnly === "true",
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortDir: (req.query.sortDir as "asc" | "desc") || "desc",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tasks/board
tasksRouter.get("/board", async (req, res, next) => {
  try {
    const result = await tasksService.board(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tasks/stats
tasksRouter.get("/stats", async (req, res, next) => {
  try {
    // Optionally filter by current member
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    const result = await tasksService.getStats(
      req.workspaceId!,
      req.query.myOnly === "true" && member ? member.id : undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks/bulk-delete
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

tasksRouter.post(
  "/bulk-delete",
  requireRole("OWNER", "ADMIN"),
  validate(bulkDeleteSchema),
  async (req, res, next) => {
    try {
      const { ids } = req.body;
      // Cancel reminders for each task
      for (const id of ids) {
        cancelTaskReminder(id).catch(() => {});
      }
      const result = await prisma.task.deleteMany({
        where: { id: { in: ids }, workspaceId: req.workspaceId! },
      });
      res.json({ deleted: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/tasks/bulk-update
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  data: z.object({
    status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().optional(),
  }),
});

tasksRouter.post(
  "/bulk-update",
  requireRole("OWNER", "ADMIN"),
  validate(bulkUpdateSchema),
  async (req, res, next) => {
    try {
      const { ids, data } = req.body;
      const updateData: Record<string, unknown> = {};
      if (data.status) updateData.status = data.status;
      if (data.priority) updateData.priority = data.priority;
      if (data.assigneeId) updateData.assigneeId = data.assigneeId;
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
      if (data.status === "DONE") updateData.completedAt = new Date();

      const result = await prisma.task.updateMany({
        where: { id: { in: ids }, workspaceId: req.workspaceId! },
        data: updateData,
      });

      // Cancel reminders for completed tasks
      if (data.status === "DONE") {
        for (const id of ids) {
          cancelTaskReminder(id).catch(() => {});
        }
      }

      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/tasks/:id
tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await tasksService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }
    const task = await tasksService.create(
      req.workspaceId!,
      member.id,
      req.body,
    );
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const task = await tasksService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// ─── Task Comments ───

const commentSchema = z.object({
  body: z.string().min(1, "תוכן התגובה נדרש"),
});

// GET /api/v1/tasks/:id/comments
tasksRouter.get("/:id/comments", async (req, res, next) => {
  try {
    const taskId = req.params.id as string;
    // Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId: req.workspaceId! },
    });
    if (!task) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
    }
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });
    const mapped = comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      authorId: c.authorId,
      authorName: c.author.user.name,
      body: c.body,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tasks/:id/comments
tasksRouter.post("/:id/comments", validate(commentSchema), async (req, res, next) => {
  try {
    const taskId = req.params.id as string;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not a workspace member" } });
    }
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId: req.workspaceId! },
    });
    if (!task) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
    }
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: member.id,
        body: req.body.body,
      },
      include: {
        author: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });
    res.status(201).json({
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      authorName: comment.author.user.name,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/tasks/:id/comments/:commentId
tasksRouter.delete("/:id/comments/:commentId", async (req, res, next) => {
  try {
    const taskId = req.params.id as string;
    const commentId = req.params.commentId as string;
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not a workspace member" } });
    }
    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });
    if (!comment) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Comment not found" } });
    }
    if (comment.authorId !== member.id) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "ניתן למחוק רק תגובות שלך" } });
    }
    await prisma.taskComment.delete({ where: { id: commentId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const taskId = req.params.id as string;
    await tasksService.remove(req.workspaceId!, taskId);
    cancelTaskReminder(taskId).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
