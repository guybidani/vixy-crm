import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { prisma } from "../db/client";
import * as viewsService from "../services/views.service";

export const viewsRouter = Router();

/** Resolve the current user's workspace member ID */
async function getMemberId(workspaceId: string, userId: string): Promise<string> {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!member) throw new Error("Member not found");
  return member.id;
}

const createSchema = z.object({
  entity: z.enum(["contacts", "deals", "tasks", "tickets"]),
  name: z.string().min(1, "שם תצוגה נדרש"),
  filters: z.record(z.unknown()),
  isDefault: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  sortBy: z.string().nullable().optional(),
  sortDir: z.enum(["asc", "desc"]).nullable().optional(),
});

// GET /api/v1/views?entity=deals
viewsRouter.get("/", async (req, res, next) => {
  try {
    const entity = req.query.entity as string;
    if (!entity) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "entity query param required" },
      });
    }
    const memberId = await getMemberId(req.workspaceId!, req.user!.userId);
    const views = await viewsService.list(req.workspaceId!, memberId, entity);
    res.json(views);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/views
viewsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const memberId = await getMemberId(req.workspaceId!, req.user!.userId);
    const view = await viewsService.create(req.workspaceId!, memberId, req.body);
    res.status(201).json(view);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/views/:id
viewsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const memberId = await getMemberId(req.workspaceId!, req.user!.userId);
    const view = await viewsService.update(
      req.workspaceId!,
      memberId,
      req.params.id as string,
      req.body,
    );
    res.json(view);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/views/:id
viewsRouter.delete("/:id", async (req, res, next) => {
  try {
    const memberId = await getMemberId(req.workspaceId!, req.user!.userId);
    await viewsService.remove(req.workspaceId!, memberId, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/views/:id/default
viewsRouter.post("/:id/default", async (req, res, next) => {
  try {
    const memberId = await getMemberId(req.workspaceId!, req.user!.userId);
    const view = await viewsService.setDefault(
      req.workspaceId!,
      memberId,
      req.params.id as string,
    );
    res.json(view);
  } catch (err) {
    next(err);
  }
});
