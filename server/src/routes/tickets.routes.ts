import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as ticketsService from "../services/tickets.service";
import { prisma } from "../db/client";

export const ticketsRouter = Router();

const URGENCY_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const createSchema = z.object({
  subject: z.string().min(1, "נושא נדרש"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  urgencyLevel: z.enum(URGENCY_LEVELS).optional(),
  channel: z.string().optional(),
  contactId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  urgencyLevel: z.enum(URGENCY_LEVELS).optional(),
  assigneeId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  body: z.string().min(1, "תוכן ההודעה נדרש"),
  isInternal: z.boolean().optional(),
});

// GET /api/v1/tickets
ticketsRouter.get("/", async (req, res, next) => {
  try {
    const result = await ticketsService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 50, 100),
      search: req.query.search as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      assigneeId: req.query.assigneeId as string,
      contactId: req.query.contactId as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortDir: (req.query.sortDir as "asc" | "desc") || "desc",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tickets/board
ticketsRouter.get("/board", async (req, res, next) => {
  try {
    const result = await ticketsService.board(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tickets/:id
ticketsRouter.get("/:id", async (req, res, next) => {
  try {
    const ticket = await ticketsService.getById(
      req.workspaceId!,
      req.params.id,
    );
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tickets/:id/messages
ticketsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const messages = await ticketsService.getMessages(
      req.workspaceId!,
      req.params.id,
    );
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tickets
ticketsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }
    const ticket = await ticketsService.create(
      req.workspaceId!,
      member.id,
      req.body,
    );
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/tickets/:id
ticketsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const ticket = await ticketsService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tickets/:id/messages
ticketsRouter.post(
  "/:id/messages",
  validate(messageSchema),
  async (req, res, next) => {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
      });
      if (!member) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Not a workspace member" },
        });
      }
      const message = await ticketsService.addMessage(
        req.workspaceId!,
        req.params.id as string,
        {
          body: req.body.body,
          senderType: "agent",
          senderId: member.id,
          isInternal: req.body.isInternal,
        },
      );
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  },
);
