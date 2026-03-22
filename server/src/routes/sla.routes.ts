import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as slaService from "../services/sla.service";

export const slaRouter = Router();

// List SLA policies
slaRouter.get("/", async (req, res, next) => {
  try {
    const data = await slaService.listSlaPolicies(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Create
const createSchema = z.object({
  name: z.string().min(1),
  firstResponseMinutes: z.number().int().positive(),
  resolutionMinutes: z.number().int().positive(),
  businessHoursOnly: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

slaRouter.post(
  "/",
  requireRole("OWNER", "ADMIN"),
  validate(createSchema),
  async (req, res, next) => {
    try {
      const data = await slaService.createSlaPolicy(req.workspaceId!, req.body);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "sla.create",
        entityType: "SlaPolicy",
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

// Update
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  firstResponseMinutes: z.number().int().positive().optional(),
  resolutionMinutes: z.number().int().positive().optional(),
  businessHoursOnly: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

slaRouter.patch(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const data = await slaService.updateSlaPolicy(
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
slaRouter.delete(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await slaService.deleteSlaPolicy(req.workspaceId!, req.params.id as string);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "sla.delete",
        entityType: "SlaPolicy",
        entityId: req.params.id as string,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);
