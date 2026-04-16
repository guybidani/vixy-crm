import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as notesService from "../services/notes.service";

export const notesRouter = Router();

const ENTITY_TYPES = ["contact", "deal", "company", "task", "ticket"] as const;

const createSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

const updateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
});

notesRouter.get("/", async (req, res, next) => {
  try {
    const result = await notesService.list({
      workspaceId: req.workspaceId!,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.min(Number(req.query.limit) || 50, 100),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

notesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const note = await notesService.create(
      req.workspaceId!,
      req.memberId!,
      req.body,
    );
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

notesRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const note = await notesService.update(
      req.workspaceId!,
      req.memberId!,
      req.params.id as string,
      req.body,
    );
    res.json(note);
  } catch (err) {
    next(err);
  }
});

notesRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await notesService.remove(
      req.workspaceId!,
      req.memberId!,
      req.params.id as string,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
