import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as contactsService from "../services/contacts.service";
import { prisma } from "../db/client";

export const contactsRouter = Router();

const createSchema = z.object({
  firstName: z.string().min(1, "שם פרטי נדרש"),
  lastName: z.string().min(1, "שם משפחה נדרש"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().uuid().optional().nullable(),
  position: z.string().optional(),
  source: z.string().optional(),
  status: z
    .enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"])
    .optional(),
  leadScore: z.number().min(0).max(100).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/contacts
contactsRouter.get("/", async (req, res, next) => {
  try {
    const result = await contactsService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 25, 100),
      search: req.query.search as string,
      status: req.query.status as string,
      companyId: req.query.companyId as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortDir: (req.query.sortDir as "asc" | "desc") || "desc",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/board
contactsRouter.get("/board", async (req, res, next) => {
  try {
    const result = await contactsService.board(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/:id
contactsRouter.get("/:id", async (req, res, next) => {
  try {
    const contact = await contactsService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/:id/timeline
contactsRouter.get("/:id/timeline", async (req, res, next) => {
  try {
    const timeline = await contactsService.getTimeline(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(timeline);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/contacts
contactsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    // Get member ID for this user in this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }

    const contact = await contactsService.create(
      req.workspaceId!,
      member.id,
      req.body,
    );
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/contacts/:id
contactsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const contact = await contactsService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/contacts/:id
contactsRouter.delete("/:id", async (req, res, next) => {
  try {
    await contactsService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
