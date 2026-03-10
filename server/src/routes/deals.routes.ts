import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as dealsService from "../services/deals.service";
import { prisma } from "../db/client";

export const dealsRouter = Router();

const createSchema = z.object({
  title: z.string().min(1, "שם עסקה נדרש"),
  value: z.number().optional(),
  stage: z
    .enum([
      "LEAD",
      "QUALIFIED",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSED_WON",
      "CLOSED_LOST",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  contactId: z.string().uuid("איש קשר נדרש"),
  companyId: z.string().uuid().optional().nullable(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().optional(),
  stage: z
    .enum([
      "LEAD",
      "QUALIFIED",
      "PROPOSAL",
      "NEGOTIATION",
      "CLOSED_WON",
      "CLOSED_LOST",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});

// GET /api/v1/deals
dealsRouter.get("/", async (req, res, next) => {
  try {
    const result = await dealsService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 50, 100),
      search: req.query.search as string,
      stage: req.query.stage as string,
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

// GET /api/v1/deals/pipeline
dealsRouter.get("/pipeline", async (req, res, next) => {
  try {
    const result = await dealsService.pipeline(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/deals/:id
dealsRouter.get("/:id", async (req, res, next) => {
  try {
    const deal = await dealsService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(deal);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/deals
dealsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }

    const deal = await dealsService.create(
      req.workspaceId!,
      member.id,
      req.body,
    );
    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/deals/:id
dealsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const deal = await dealsService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(deal);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/deals/:id
dealsRouter.delete("/:id", async (req, res, next) => {
  try {
    await dealsService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
