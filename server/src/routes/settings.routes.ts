import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as settingsService from "../services/settings.service";

export const settingsRouter = Router();

const optionOverride = z.object({
  label: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  hidden: z.boolean().optional(),
});

const optionOverrideNoHidden = z.object({
  label: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

const activityOverride = z.object({
  label: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
});

const channelOverride = z.object({
  label: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

const optionsSchema = z.object({
  dealStages: z.record(optionOverride).optional(),
  priorities: z.record(optionOverrideNoHidden).optional(),
  ticketStatuses: z.record(optionOverride).optional(),
  taskStatuses: z.record(optionOverride).optional(),
  contactStatuses: z.record(optionOverride).optional(),
  companyStatuses: z.record(optionOverride).optional(),
  activityTypes: z.record(activityOverride).optional(),
  leadSources: z.array(z.string().min(1)).optional(),
  ticketChannels: z.record(channelOverride).optional(),
});

// ─── Nav Permissions ───

const navPermissionsSchema = z.object({
  navPermissions: z.record(z.array(z.string())),
});

// GET /settings/nav-permissions — any workspace member can read
settingsRouter.get("/nav-permissions", async (req, res, next) => {
  try {
    const data = await settingsService.getNavPermissions(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /settings/nav-permissions — OWNER or ADMIN only
settingsRouter.put(
  "/nav-permissions",
  requireRole("OWNER", "ADMIN"),
  validate(navPermissionsSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.updateNavPermissions(
        req.workspaceId!,
        req.body.navPermissions,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.nav_permissions.update",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        ip: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Module Labels ───

const moduleLabelsSchema = z.object({
  moduleLabels: z.record(z.string().min(1)).refine(
    (labels) => Object.keys(labels).every((k) =>
      ["dashboard", "contacts", "companies", "deals", "leads", "tasks", "tickets",
       "documents", "knowledge", "templates", "automations", "reports", "analytics",
       "history", "import"].includes(k)
    ),
    { message: "Invalid module key" },
  ),
});

// GET /settings/module-labels — any workspace member can read
settingsRouter.get("/module-labels", async (req, res, next) => {
  try {
    const data = await settingsService.getModuleLabels(req.workspaceId!);
    res.json({ moduleLabels: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /settings/module-labels — OWNER or ADMIN only
settingsRouter.patch(
  "/module-labels",
  requireRole("OWNER", "ADMIN"),
  validate(moduleLabelsSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.updateModuleLabels(
        req.workspaceId!,
        req.body.moduleLabels,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.module_labels.update",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        ip: req.ip,
      });
      res.json({ moduleLabels: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Snooze Options ───

const snoozeOptionSchema = z.object({
  label: z.string().min(1),
  minutes: z.number().int(),
  special: z.string().min(1).optional(),
}).refine(
  (opt) => opt.minutes > 0 || (opt.minutes === -1 && !!opt.special),
  { message: "minutes must be > 0, or -1 with a special field" },
);

const snoozeOptionsSchema = z.object({
  snoozeOptions: z.array(snoozeOptionSchema).min(1).max(10),
});

// GET /settings/snooze-options — any workspace member can read
settingsRouter.get("/snooze-options", async (req, res, next) => {
  try {
    const data = await settingsService.getSnoozeOptions(req.workspaceId!);
    res.json({ snoozeOptions: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /settings/snooze-options — OWNER or ADMIN only
settingsRouter.patch(
  "/snooze-options",
  requireRole("OWNER", "ADMIN"),
  validate(snoozeOptionsSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.updateSnoozeOptions(
        req.workspaceId!,
        req.body.snoozeOptions,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.snooze_options.update",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        ip: req.ip,
      });
      res.json({ snoozeOptions: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Onboarding / Industry Templates ───

const applyTemplateSchema = z.object({
  templateId: z.string().min(1),
});

// GET /settings/setup-status — any workspace member can read
settingsRouter.get("/setup-status", async (req, res, next) => {
  try {
    const data = await settingsService.getSetupStatus(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /settings/templates — list all available industry templates
settingsRouter.get("/templates", async (_req, res) => {
  res.json({ templates: settingsService.INDUSTRY_TEMPLATES });
});

// POST /settings/apply-template — OWNER or ADMIN only
settingsRouter.post(
  "/apply-template",
  requireRole("OWNER", "ADMIN"),
  validate(applyTemplateSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.applyIndustryTemplate(
        req.workspaceId!,
        req.body.templateId,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.template.apply",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        metadata: { templateId: req.body.templateId },
        ip: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /settings/skip-onboarding — OWNER or ADMIN only
settingsRouter.post(
  "/skip-onboarding",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      const result = await settingsService.skipOnboarding(req.workspaceId!);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.onboarding.skip",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        ip: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /settings/options — any workspace member can read
settingsRouter.get("/options", async (req, res, next) => {
  try {
    const data = await settingsService.getWorkspaceOptions(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /settings/options — OWNER or ADMIN only
settingsRouter.put(
  "/options",
  requireRole("OWNER", "ADMIN"),
  validate(optionsSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.updateWorkspaceOptions(
        req.workspaceId!,
        req.body,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.options.update",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        ip: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
