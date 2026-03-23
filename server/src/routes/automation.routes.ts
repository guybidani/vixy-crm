import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as automationService from "../services/automation.service";
import { prisma } from "../db/client";

export const automationRouter = Router();

const actionSchema = z.object({
  type: z.enum([
    "SEND_NOTIFICATION",
    "CREATE_TASK",
    "CHANGE_FIELD",
    "SEND_EMAIL",
    "ADD_TAG",
    "MOVE_STAGE",
    "ASSIGN_OWNER",
  ]),
  config: z.record(z.any()),
  order: z.number().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "שם נדרש"),
  description: z.string().optional(),
  trigger: z.enum([
    "DEAL_STAGE_CHANGED",
    "DEAL_CREATED",
    "CONTACT_CREATED",
    "CONTACT_STATUS_CHANGED",
    "TASK_CREATED",
    "TASK_COMPLETED",
    "TICKET_CREATED",
    "TICKET_STATUS_CHANGED",
    "LEAD_SCORE_CHANGED",
    "ENTITY_UPDATED",
  ]),
  conditions: z.array(z.any()).optional(),
  actions: z.array(actionSchema).min(1, "נדרשת לפחות פעולה אחת"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z
    .enum([
      "DEAL_STAGE_CHANGED",
      "DEAL_CREATED",
      "CONTACT_CREATED",
      "CONTACT_STATUS_CHANGED",
      "TASK_CREATED",
      "TASK_COMPLETED",
      "TICKET_CREATED",
      "TICKET_STATUS_CHANGED",
      "LEAD_SCORE_CHANGED",
      "ENTITY_UPDATED",
    ])
    .optional(),
  conditions: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
  actions: z.array(actionSchema).optional(),
});

// GET /api/v1/automations
automationRouter.get("/", async (req, res, next) => {
  try {
    const workflows = await automationService.listWorkflows({
      workspaceId: req.workspaceId!,
      trigger: req.query.trigger as string,
      isActive:
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
    });
    res.json({ data: workflows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/automations/:id
automationRouter.get("/:id", async (req, res, next) => {
  try {
    const workflow = await automationService.getWorkflow(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/automations
automationRouter.post(
  "/",
  requireRole("OWNER", "ADMIN"),
  validate(createSchema),
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
      const workflow = await automationService.createWorkflow(
        req.workspaceId!,
        member.id,
        req.body,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "automation.create",
        entityType: "AutomationWorkflow",
        entityId: workflow.id,
        metadata: { name: req.body.name, trigger: req.body.trigger },
        ip: req.ip,
      });
      res.status(201).json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/automations/:id
automationRouter.patch(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const workflow = await automationService.updateWorkflow(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/automations/:id/toggle
const toggleSchema = z.object({
  isActive: z.boolean(),
});

automationRouter.patch(
  "/:id/toggle",
  requireRole("OWNER", "ADMIN"),
  validate(toggleSchema),
  async (req, res, next) => {
    try {
      const { isActive } = req.body;
      const workflow = await automationService.toggleWorkflow(
        req.workspaceId!,
        req.params.id as string,
        isActive,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: isActive ? "automation.enable" : "automation.disable",
        entityType: "AutomationWorkflow",
        entityId: req.params.id as string,
        ip: req.ip,
      });
      res.json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/automations/:id
automationRouter.delete(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await automationService.deleteWorkflow(
        req.workspaceId!,
        req.params.id as string,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "automation.delete",
        entityType: "AutomationWorkflow",
        entityId: req.params.id as string,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/automations/:id/runs
automationRouter.get("/:id/runs", async (req, res, next) => {
  try {
    const runs = await automationService.getWorkflowRuns(
      req.workspaceId!,
      req.params.id as string,
      Math.min(Number(req.query.limit) || 50, 100),
    );
    res.json({ data: runs });
  } catch (err) {
    next(err);
  }
});
