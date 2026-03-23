import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { prisma } from "../db/client";
import * as templatesService from "../services/templates.service";

export const templatesRouter = Router();

// List all templates (filter by category/channel)
templatesRouter.get("/", async (req, res, next) => {
  try {
    const { category, channel } = req.query;
    const data = await templatesService.listTemplates(req.workspaceId!, {
      category: category as string | undefined,
      channel: channel as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Get one template
templatesRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await templatesService.getTemplate(
      req.workspaceId!,
      req.params.id,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Create
const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["SALES", "SERVICE", "GENERAL"]).optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS"]).optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z
    .array(z.object({ name: z.string(), label: z.string() }))
    .optional(),
});

templatesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }
    const data = await templatesService.createTemplate(req.workspaceId!, {
      ...req.body,
      createdById: member.id,
    });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Update
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["SALES", "SERVICE", "GENERAL"]).optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS"]).optional(),
  subject: z.string().nullable().optional(),
  body: z.string().min(1).optional(),
  variables: z
    .array(z.object({ name: z.string(), label: z.string() }))
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

templatesRouter.patch(
  "/:id",
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const data = await templatesService.updateTemplate(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// Delete
templatesRouter.delete("/:id", async (req, res, next) => {
  try {
    await templatesService.deleteTemplate(req.workspaceId!, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Render with variables
const renderSchema = z.object({
  variables: z.record(z.string()),
});

templatesRouter.post(
  "/:id/render",
  validate(renderSchema),
  async (req, res, next) => {
    try {
      const data = await templatesService.renderAndTrack(
        req.workspaceId!,
        req.params.id as string,
        req.body.variables,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);
