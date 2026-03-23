import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as tasksService from "../services/tasks.service";
import { prisma } from "../db/client";
import { cancelTaskReminder } from "../queue/reminder.queue";

export const tasksRouter = Router();

const TASK_TYPES = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "FOLLOW_UP", "TASK"] as const;

const createSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
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
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
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
      limit: Math.min(Number(req.query.limit) || 50, 100),
      status: req.query.status as string,
      taskType: req.query.taskType as string,
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

tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    const taskId = req.params.id as string;
    await tasksService.remove(req.workspaceId!, taskId);
    cancelTaskReminder(taskId).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
