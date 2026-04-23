import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { brandingUpload } from "../middleware/brandingUpload";
import { audit } from "../services/audit.service";
import * as settingsService from "../services/settings.service";
import { generateDemoData } from "../services/demo-data.service";

export const settingsRouter = Router();

// Record cap — we store these on a single workspace row so allowing an
// attacker to post an unbounded number of keys would blow up the JSON
// payload size and storage.
const MAX_OPTION_CATEGORY_KEYS = 20;
const MAX_OPTIONS_PER_CATEGORY = 50;

const optionOverride = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(30).optional(),
  order: z.number().int().min(0).optional(),
  hidden: z.boolean().optional(),
});

const optionOverrideNoHidden = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(30).optional(),
  order: z.number().int().min(0).optional(),
});

const activityOverride = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(30).optional(),
  icon: z.string().min(1).max(50).optional(),
});

const channelOverride = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(30).optional(),
});

// Each category is a record keyed by enum value (e.g. "LEAD" → override).
// Bound the key count so settings JSON can't be grown unboundedly.
const boundedOverrideRecord = z.record(optionOverride).refine(
  (r) => Object.keys(r).length <= MAX_OPTION_CATEGORY_KEYS,
  { message: `A category may have at most ${MAX_OPTION_CATEGORY_KEYS} keys` },
);
const boundedOverrideNoHiddenRecord = z.record(optionOverrideNoHidden).refine(
  (r) => Object.keys(r).length <= MAX_OPTION_CATEGORY_KEYS,
  { message: `A category may have at most ${MAX_OPTION_CATEGORY_KEYS} keys` },
);
const boundedActivityRecord = z.record(activityOverride).refine(
  (r) => Object.keys(r).length <= MAX_OPTION_CATEGORY_KEYS,
  { message: `A category may have at most ${MAX_OPTION_CATEGORY_KEYS} keys` },
);
const boundedChannelRecord = z.record(channelOverride).refine(
  (r) => Object.keys(r).length <= MAX_OPTION_CATEGORY_KEYS,
  { message: `A category may have at most ${MAX_OPTION_CATEGORY_KEYS} keys` },
);

const optionsSchema = z.object({
  dealStages: boundedOverrideRecord.optional(),
  priorities: boundedOverrideNoHiddenRecord.optional(),
  ticketStatuses: boundedOverrideRecord.optional(),
  taskStatuses: boundedOverrideRecord.optional(),
  contactStatuses: boundedOverrideRecord.optional(),
  companyStatuses: boundedOverrideRecord.optional(),
  activityTypes: boundedActivityRecord.optional(),
  leadSources: z.array(z.string().min(1).max(100)).max(50).optional(),
  ticketChannels: boundedChannelRecord.optional(),
}).refine(
  // Cross-category guard: no single sub-record should exceed per-category cap.
  // We leave this to the refiners above but keep the outer object so future
  // fields are easy to add.
  () => true,
  { message: "" },
);
// Note: MAX_OPTIONS_PER_CATEGORY is enforced implicitly by MAX_OPTION_CATEGORY_KEYS
// on the record-keyed overrides, which are per-category maps. For the array-
// typed `leadSources` we cap at 50 directly above.
void MAX_OPTIONS_PER_CATEGORY;

// ─── Nav Permissions ───

const navPermissionsSchema = z.object({
  navPermissions: z.record(
    z.array(z.string().min(1).max(50)).max(20),
  ).refine(
    (r) => Object.keys(r).length <= 100,
    { message: "navPermissions may have at most 100 member keys" },
  ),
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
  moduleLabels: z.record(z.string().min(1).max(50)).refine(
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
  label: z.string().min(1).max(100),
  minutes: z.number().int(),
  special: z.string().min(1).max(50).optional(),
}).refine(
  (opt) => opt.minutes > 0 || (opt.minutes === -1 && !!opt.special),
  { message: "minutes must be > 0, or -1 with a special field" },
);

const snoozeOptionsSchema = z.object({
  snoozeOptions: z.array(snoozeOptionSchema).min(1).max(20),
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
  templateId: z.string().min(1).max(100),
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

// POST /settings/populate-demo-data — OWNER or ADMIN only.
//
// Generates industry-specific demo data (companies, contacts, deals) for the
// given template. Fire-and-forget semantics: we kick off the generator in
// the background and return 202 so the UI can navigate into the dashboard
// while data streams in. Errors are logged but never bubble up to the
// caller because the request has already been answered.
settingsRouter.post(
  "/populate-demo-data",
  requireRole("OWNER", "ADMIN"),
  validate(applyTemplateSchema),
  async (req, res, next) => {
    try {
      const workspaceId = req.workspaceId!;
      const memberId = req.memberId!;
      const userId = req.user!.userId;
      const ip = req.ip;
      const templateId = req.body.templateId as string;

      // Kick off the generator detached from the request. The user can
      // navigate to the dashboard immediately; data appears as soon as the
      // bulk insert transaction commits (~1s typical).
      void generateDemoData(workspaceId, memberId, templateId)
        .then((result) => {
          audit({
            workspaceId,
            userId,
            action: "settings.demo_data.populated",
            entityType: "Workspace",
            entityId: workspaceId,
            metadata: { templateId, ...result },
            ip,
          });
        })
        .catch((err) => {
          // Detached promise — must catch, otherwise a DB hiccup becomes an
          // unhandled rejection that can crash the Node process.
          // eslint-disable-next-line no-console
          console.error("[demo-data] population failed", {
            workspaceId,
            templateId,
            err,
          });
          audit({
            workspaceId,
            userId,
            action: "settings.demo_data.failed",
            entityType: "Workspace",
            entityId: workspaceId,
            metadata: {
              templateId,
              error: err instanceof Error ? err.message : String(err),
            },
            ip,
          });
        });

      res.status(202).json({ accepted: true, templateId });
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

// GET /settings/workspace-members-mentions — slim member list for @mention
// dropdowns. Any authenticated workspace member can read (not admin-gated);
// the dropdown needs to work for everyone who can write a note.
settingsRouter.get("/workspace-members-mentions", async (req, res, next) => {
  try {
    const members = await settingsService.listMentionableMembers(
      req.workspaceId!,
    );
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

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

// ─── Dashboard Layout (per workspace member) ───

const dashboardWidgetSchema = z.object({
  id: z.string().min(1).max(64),
  visible: z.boolean(),
  order: z.number().int().min(0).max(100),
  size: z.enum(["small", "medium", "large"]),
});

const dashboardLayoutSchema = z.object({
  widgets: z.array(dashboardWidgetSchema).max(50),
});

// GET /settings/dashboard-layout — any workspace member reads their own layout
settingsRouter.get("/dashboard-layout", async (req, res, next) => {
  try {
    const layout = await settingsService.getDashboardLayout(req.memberId!);
    res.json(layout);
  } catch (err) {
    next(err);
  }
});

// PUT /settings/dashboard-layout — any workspace member updates their own layout
settingsRouter.put(
  "/dashboard-layout",
  validate(dashboardLayoutSchema),
  async (req, res, next) => {
    try {
      const layout = await settingsService.updateDashboardLayout(
        req.memberId!,
        req.body,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.dashboard_layout.update",
        entityType: "WorkspaceMember",
        entityId: req.memberId!,
        ip: req.ip,
      });
      res.json(layout);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Branding ───

// Hex color string — #RGB or #RRGGBB (case-insensitive). Null/empty resets to default.
const brandingSchema = z.object({
  logoUrl: z.string().max(500).nullable().optional(),
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "צבע מותג חייב להיות קוד HEX תקין")
    .nullable()
    .optional(),
});

// PATCH /settings/branding — update logo URL and/or brand color (OWNER/ADMIN)
settingsRouter.patch(
  "/branding",
  requireRole("OWNER", "ADMIN"),
  validate(brandingSchema),
  async (req, res, next) => {
    try {
      const result = await settingsService.updateBranding(req.workspaceId!, {
        logoUrl: req.body.logoUrl,
        brandColor: req.body.brandColor,
      });
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.branding.update",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        metadata: {
          logoUrlSet: req.body.logoUrl !== undefined,
          brandColor: req.body.brandColor ?? undefined,
        },
        ip: req.ip,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /settings/branding/logo — multipart logo upload (OWNER/ADMIN)
// Field name "logo". Stores file in uploads/branding/ and returns a public
// path served by the /branding/:filename route (no auth required).
settingsRouter.post(
  "/branding/logo",
  requireRole("OWNER", "ADMIN"),
  brandingUpload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "לא נבחר קובץ" },
        });
      }

      const publicPath = `/branding/${req.file.filename}`;
      const result = await settingsService.updateBranding(req.workspaceId!, {
        logoUrl: publicPath,
      });

      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "settings.branding.logo_upload",
        entityType: "Workspace",
        entityId: req.workspaceId!,
        metadata: {
          fileName: req.file.originalname,
          size: req.file.size,
        },
        ip: req.ip,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
