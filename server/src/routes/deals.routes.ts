import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
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
  bantData: z.object({
    budget: z.string().optional(),
    authority: z.string().optional(),
    need: z.string().optional(),
    timeline: z.string().optional(),
  }).optional().nullable(),
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

// POST /api/v1/deals/bulk-delete
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

dealsRouter.post(
  "/bulk-delete",
  requireRole("OWNER", "ADMIN"),
  validate(bulkDeleteSchema),
  async (req, res, next) => {
    try {
      const { ids } = req.body;
      const result = await prisma.deal.deleteMany({
        where: { id: { in: ids }, workspaceId: req.workspaceId! },
      });
      res.json({ deleted: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/deals/bulk-update
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  data: z.object({
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
    tagId: z.string().uuid().optional(),
  }),
});

dealsRouter.post(
  "/bulk-update",
  requireRole("OWNER", "ADMIN"),
  validate(bulkUpdateSchema),
  async (req, res, next) => {
    try {
      const { ids, data } = req.body;

      const updateData: Record<string, any> = {};
      if (data.stage) updateData.stage = data.stage;
      if (data.priority) updateData.priority = data.priority;

      if (Object.keys(updateData).length > 0) {
        await prisma.deal.updateMany({
          where: { id: { in: ids }, workspaceId: req.workspaceId! },
          data: updateData,
        });
      }

      if (data.tagId) {
        const tag = await prisma.tag.findFirst({
          where: { id: data.tagId, workspaceId: req.workspaceId! },
        });
        if (!tag) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Tag not found" },
          });
        }
        // Verify all deals belong to this workspace before tagging —
        // prevents BOLA: attacker submitting foreign deal IDs to attach tags
        const ownedDeals = await prisma.deal.findMany({
          where: { id: { in: ids }, workspaceId: req.workspaceId! },
          select: { id: true },
        });
        const ownedIds = ownedDeals.map((d) => d.id);
        await Promise.all(
          ownedIds.map((dealId: string) =>
            prisma.tagOnDeal.upsert({
              where: { dealId_tagId: { dealId, tagId: data.tagId } },
              create: { dealId, tagId: data.tagId },
              update: {},
            }),
          ),
        );
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

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
    const deal = await dealsService.create(
      req.workspaceId!,
      req.memberId!,
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
      req.memberId,
    );
    res.json(deal);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/deals/:id
dealsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    await dealsService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
