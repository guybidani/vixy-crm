import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import * as companiesService from "../services/companies.service";

export const companiesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1, "שם חברה נדרש"),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema
  .extend({
    status: z.enum(["PROSPECT", "ACTIVE", "INACTIVE", "CHURNED"]).optional(),
  })
  .partial();

// GET /api/v1/companies
companiesRouter.get("/", async (req, res, next) => {
  try {
    const result = await companiesService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 25, 100),
      search: req.query.search as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortDir: (req.query.sortDir as "asc" | "desc") || "desc",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/companies/board
companiesRouter.get("/board", async (req, res, next) => {
  try {
    const result = await companiesService.board(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/companies/:id
companiesRouter.get("/:id", async (req, res, next) => {
  try {
    const company = await companiesService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/companies
companiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const company = await companiesService.create(req.workspaceId!, req.body);
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/companies/:id
companiesRouter.patch(
  "/:id",
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const company = await companiesService.update(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.json(company);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/companies/:id
companiesRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    await companiesService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
