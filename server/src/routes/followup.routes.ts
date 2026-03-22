import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as followupService from "../services/followup.service";

export const followupRouter = Router();

// ─── Sequences ───

followupRouter.get("/sequences", async (req, res, next) => {
  try {
    const data = await followupService.listSequences(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

followupRouter.get("/sequences/:id", async (req, res, next) => {
  try {
    const data = await followupService.getSequence(
      req.workspaceId!,
      req.params.id,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const createSequenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerStatuses: z.array(z.string()).min(1),
  endAction: z.string().optional(),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().positive(),
        delayDays: z.number().int().positive(),
        channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "CALL_TASK"]),
        messageTemplate: z.string().optional(),
      }),
    )
    .min(1),
});

followupRouter.post(
  "/sequences",
  requireRole("OWNER", "ADMIN"),
  validate(createSequenceSchema),
  async (req, res, next) => {
    try {
      const data = await followupService.createSequence(
        req.workspaceId!,
        req.body,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "followup.create",
        entityType: "FollowUpSequence",
        entityId: data.id,
        metadata: { name: req.body.name },
        ip: req.ip,
      });
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

const updateSequenceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  triggerStatuses: z.array(z.string()).optional(),
  endAction: z.string().optional(),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().positive(),
        delayDays: z.number().int().positive(),
        channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "CALL_TASK"]),
        messageTemplate: z.string().optional(),
      }),
    )
    .optional(),
});

followupRouter.put(
  "/sequences/:id",
  requireRole("OWNER", "ADMIN"),
  validate(updateSequenceSchema),
  async (req, res, next) => {
    try {
      const data = await followupService.updateSequence(
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

followupRouter.delete(
  "/sequences/:id",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await followupService.deleteSequence(req.workspaceId!, req.params.id as string);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "followup.delete",
        entityType: "FollowUpSequence",
        entityId: req.params.id as string,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

followupRouter.post(
  "/sequences/:id/toggle",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      const data = await followupService.toggleSequence(
        req.workspaceId!,
        req.params.id as string,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Executions ───

const startExecutionSchema = z.object({
  sequenceId: z.string().uuid(),
  contactId: z.string().uuid(),
});

followupRouter.post(
  "/executions/start",
  validate(startExecutionSchema),
  async (req, res, next) => {
    try {
      const data = await followupService.startExecution(
        req.workspaceId!,
        req.body,
      );
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

followupRouter.post("/executions/:id/stop", async (req, res, next) => {
  try {
    const data = await followupService.stopExecution(
      req.workspaceId!,
      req.params.id,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

followupRouter.get("/executions/contact/:contactId", async (req, res, next) => {
  try {
    const data = await followupService.getContactExecutions(
      req.workspaceId!,
      req.params.contactId,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});
