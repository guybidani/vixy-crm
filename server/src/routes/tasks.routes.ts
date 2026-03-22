import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as tasksService from "../services/tasks.service";
import { prisma } from "../db/client";
import { cancelTaskReminder } from "../queue/reminder.queue";

export const tasksRouter = Router();

const createSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
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
  dueDate: z.string().optional(),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "שעה חייבת להיות בפורמט HH:mm")
    .optional()
    .nullable(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
  assigneeId: z.string().uuid().optional(),
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const result = await tasksService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 50, 100),
      status: req.query.status as string,
      assigneeId: req.query.assigneeId as string,
      contactId: req.query.contactId as string,
      dealId: req.query.dealId as string,
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
