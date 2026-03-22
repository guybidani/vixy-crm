import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import * as tagsService from "../services/tags.service";

export const tagsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1, "שם תגית נדרש"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

const assignSchema = z.object({
  tagId: z.string().uuid(),
  entityType: z.enum(["contact", "deal"]),
  entityId: z.string().uuid(),
});

// GET /api/v1/tags
tagsRouter.get("/", async (req, res, next) => {
  try {
    const tags = await tagsService.list(req.workspaceId!);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tags
tagsRouter.post("/", requireRole("OWNER", "ADMIN"), validate(createSchema), async (req, res, next) => {
  try {
    const tag = await tagsService.create(req.workspaceId!, req.body);
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/tags/:id
tagsRouter.patch("/:id", requireRole("OWNER", "ADMIN"), validate(updateSchema), async (req, res, next) => {
  try {
    const tag = await tagsService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(tag);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/tags/:id
tagsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    await tagsService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tags/assign
tagsRouter.post("/assign", validate(assignSchema), async (req, res, next) => {
  try {
    const { tagId, entityType, entityId } = req.body;
    if (entityType === "contact") {
      await tagsService.assignToContact(req.workspaceId!, entityId, tagId);
    } else {
      await tagsService.assignToDeal(req.workspaceId!, entityId, tagId);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tags/unassign
tagsRouter.post("/unassign", validate(assignSchema), async (req, res, next) => {
  try {
    const { tagId, entityType, entityId } = req.body;
    if (entityType === "contact") {
      await tagsService.unassignFromContact(entityId, tagId);
    } else {
      await tagsService.unassignFromDeal(entityId, tagId);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
