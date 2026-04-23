import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

// ─── Shared helper ───

/**
 * Read-modify-write a workspace's `settings` JSON column inside a transaction.
 * Prevents concurrent updates from clobbering each other's unrelated keys.
 *
 * `patchFn` receives the current settings object and returns a partial patch;
 * the patch is shallow-merged onto the existing settings (so unrelated top-
 * level keys survive untouched).
 *
 * Returns the full updated settings object — callers pick out whatever slice
 * they want to return to the client.
 */
async function patchWorkspaceSettings(
  workspaceId: string,
  patchFn: (existing: Record<string, any>) => Record<string, any>,
): Promise<Record<string, any>> {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existing = (workspace.settings as Record<string, any>) || {};
    const patch = patchFn(existing);
    const newSettings = { ...existing, ...patch };

    const updated = await tx.workspace.update({
      where: { id: workspaceId },
      data: { settings: newSettings },
      select: { settings: true },
    });
    return (updated.settings as Record<string, any>) || {};
  });
}

// ─── Snooze Options ───

export interface SnoozeOption {
  label: string;
  minutes: number;
  special?: string;
}

export const DEFAULT_SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "שעה", minutes: 60 },
  { label: "שעתיים", minutes: 120 },
  { label: "4 שעות", minutes: 240 },
  { label: "מחר בבוקר", minutes: -1, special: "tomorrow_9am" },
  { label: "עוד שבוע בבוקר", minutes: -1, special: "next_sunday_9am" },
];

export async function getSnoozeOptions(workspaceId: string): Promise<SnoozeOption[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  return settings.snoozeOptions || DEFAULT_SNOOZE_OPTIONS;
}

export async function updateSnoozeOptions(
  workspaceId: string,
  snoozeOptions: SnoozeOption[],
): Promise<SnoozeOption[]> {
  const settings = await patchWorkspaceSettings(workspaceId, () => ({
    snoozeOptions: snoozeOptions as unknown as Record<string, any>[],
  }));
  return settings.snoozeOptions || DEFAULT_SNOOZE_OPTIONS;
}

/** Default option configs — source of truth for labels, colors, ordering. */
export const DEFAULT_OPTIONS = {
  dealStages: {
    LEAD: { label: "ליד", color: "#C4C4C4", order: 0 },
    QUALIFIED: { label: "מוסמך", color: "#A25DDC", order: 1 },
    PROPOSAL: { label: "הצעת מחיר", color: "#6161FF", order: 2 },
    NEGOTIATION: { label: "משא ומתן", color: "#FDAB3D", order: 3 },
    CLOSED_WON: { label: "נסגר - הצלחה", color: "#00CA72", order: 4 },
    CLOSED_LOST: { label: "נסגר - הפסד", color: "#FB275D", order: 5 },
  },
  priorities: {
    LOW: { label: "נמוך", color: "#66CCFF", order: 0 },
    MEDIUM: { label: "בינוני", color: "#6161FF", order: 1 },
    HIGH: { label: "גבוה", color: "#FDAB3D", order: 2 },
    URGENT: { label: "דחוף", color: "#FB275D", order: 3 },
  },
  ticketStatuses: {
    NEW: { label: "חדש", color: "#579BFC", order: 0 },
    OPEN: { label: "פתוח", color: "#FDAB3D", order: 1 },
    PENDING: { label: "ממתין", color: "#FF642E", order: 2 },
    RESOLVED: { label: "נפתר", color: "#00CA72", order: 3 },
    CLOSED: { label: "סגור", color: "#C4C4C4", order: 4 },
  },
  taskStatuses: {
    TODO: { label: "לביצוע", color: "#579BFC", order: 0 },
    IN_PROGRESS: { label: "בתהליך", color: "#FDAB3D", order: 1 },
    DONE: { label: "הושלם", color: "#00CA72", order: 2 },
    CANCELLED: { label: "בוטל", color: "#C4C4C4", order: 3 },
  },
  contactStatuses: {
    LEAD: { label: "ליד", color: "#579BFC", order: 0 },
    QUALIFIED: { label: "מוסמך", color: "#A25DDC", order: 1 },
    CUSTOMER: { label: "לקוח", color: "#00CA72", order: 2 },
    CHURNED: { label: "נטש", color: "#FB275D", order: 3 },
    INACTIVE: { label: "לא פעיל", color: "#C4C4C4", order: 4 },
  },
  companyStatuses: {
    PROSPECT: { label: "פוטנציאלי", color: "#579BFC", order: 0 },
    ACTIVE: { label: "פעיל", color: "#00CA72", order: 1 },
    INACTIVE: { label: "לא פעיל", color: "#C4C4C4", order: 2 },
    CHURNED: { label: "נטש", color: "#FB275D", order: 3 },
  },
  activityTypes: {
    NOTE: { label: "הערה", icon: "StickyNote", color: "#6161FF" },
    CALL: { label: "שיחה", icon: "Phone", color: "#00CA72" },
    EMAIL: { label: "אימייל", icon: "Mail", color: "#579BFC" },
    MEETING: { label: "פגישה", icon: "Calendar", color: "#A25DDC" },
    WHATSAPP: { label: "ווטסאפ", icon: "MessageCircle", color: "#25D366" },
    STATUS_CHANGE: {
      label: "שינוי סטטוס",
      icon: "ArrowRight",
      color: "#FDAB3D",
    },
    SYSTEM: { label: "מערכת", icon: "Bot", color: "#C4C4C4" },
  },
  leadSources: ["אתר", "טלפון", "הפניה", "פייסבוק", "vixy", "אחר"],
  ticketChannels: {
    email: { label: "אימייל", color: "#579BFC" },
    whatsapp: { label: "ווטסאפ", color: "#25D366" },
    chat: { label: "צ׳אט", color: "#6161FF" },
    phone: { label: "טלפון", color: "#FDAB3D" },
    portal: { label: "פורטל", color: "#A25DDC" },
  },
} as const;

const SYSTEM_ACTIVITY_TYPES = new Set(["STATUS_CHANGE", "SYSTEM"]);

export async function getWorkspaceOptions(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true, logoUrl: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  const moduleLabelsOverrides = (settings.moduleLabels || {}) as Record<string, string>;
  return {
    customOptions: settings.customOptions || {},
    defaults: DEFAULT_OPTIONS,
    snoozeOptions: settings.snoozeOptions || DEFAULT_SNOOZE_OPTIONS,
    moduleLabels: { ...DEFAULT_MODULE_LABELS, ...moduleLabelsOverrides },
    branding: {
      logoUrl: workspace.logoUrl ?? null,
      brandColor: (settings.brandColor as string | undefined) ?? null,
    },
  };
}

// ─── Branding ───

export const DEFAULT_BRAND_COLOR = "#0073EA";

/** Update the workspace branding (logo URL and/or brand color). */
export async function updateBranding(
  workspaceId: string,
  data: { logoUrl?: string | null; brandColor?: string | null },
) {
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true, logoUrl: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    // Merge settings — only include brandColor if explicitly provided.
    const newSettings: Record<string, any> = { ...existingSettings };
    if (data.brandColor !== undefined) {
      if (data.brandColor === null || data.brandColor === "") {
        delete newSettings.brandColor;
      } else {
        newSettings.brandColor = data.brandColor;
      }
    }

    const updateData: { settings: Record<string, any>; logoUrl?: string | null } = {
      settings: newSettings,
    };
    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl === "" ? null : data.logoUrl;
    }

    return tx.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: { settings: true, logoUrl: true },
    });
  });

  const settings = (updated.settings as Record<string, any>) || {};
  return {
    logoUrl: updated.logoUrl ?? null,
    brandColor: (settings.brandColor as string | undefined) ?? null,
  };
}

// ─── Nav Permissions ───

export async function getNavPermissions(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  return { navPermissions: (settings.navPermissions || {}) as Record<string, string[]> };
}

export async function updateNavPermissions(
  workspaceId: string,
  navPermissions: Record<string, string[]>,
) {
  const settings = await patchWorkspaceSettings(workspaceId, () => ({
    navPermissions,
  }));
  return {
    navPermissions: (settings.navPermissions || {}) as Record<string, string[]>,
  };
}

// ─── Module Labels ───

export const DEFAULT_MODULE_LABELS: Record<string, string> = {
  dashboard: "דשבורד",
  contacts: "אנשי קשר",
  companies: "חברות",
  deals: "עסקאות",
  leads: "לידים",
  tasks: "משימות",
  tickets: "קריאות שירות",
  documents: "מסמכים",
  knowledge: "מאגר ידע",
  templates: "תבניות",
  automations: "אוטומציות",
  reports: "דוחות",
  analytics: "ניתוחים",
  history: "היסטוריה",
  import: "ייבוא",
};

export async function getModuleLabels(workspaceId: string): Promise<Record<string, string>> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  const overrides = (settings.moduleLabels || {}) as Record<string, string>;
  return { ...DEFAULT_MODULE_LABELS, ...overrides };
}

export async function updateModuleLabels(
  workspaceId: string,
  moduleLabels: Record<string, string>,
): Promise<Record<string, string>> {
  // Only store overrides that differ from defaults — avoids bloating the
  // settings JSON with redundant values and makes default-tracking possible.
  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(moduleLabels)) {
    if (key in DEFAULT_MODULE_LABELS && value !== DEFAULT_MODULE_LABELS[key]) {
      overrides[key] = value;
    }
  }

  const settings = await patchWorkspaceSettings(workspaceId, () => ({
    moduleLabels: overrides,
  }));
  return { ...DEFAULT_MODULE_LABELS, ...(settings.moduleLabels || {}) };
}

// ─── Industry Templates ───

export interface IndustryTemplate {
  name: string;
  icon: string;
  description: string;
  moduleLabels: Record<string, string>;
  dealStages: string[];
  contactStatuses: string[];
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  sales: {
    name: "מכירות B2B",
    icon: "💼",
    description: "צוותי מכירות, SDR, AE",
    moduleLabels: { contacts: "אנשי קשר", deals: "עסקאות", leads: "לידים", tickets: "תמיכה" },
    dealStages: ["ליד", "הסמכה", "הצעת מחיר", "משא ומתן", "נסגר-הצלחה", "נסגר-הפסד"],
    contactStatuses: ["ליד", "מוסמך", "לקוח", "נטש", "לא פעיל"],
  },
  realestate: {
    name: 'נדל"ן',
    icon: "🏠",
    description: "סוכנויות נדל\"ן, יזמים",
    moduleLabels: { contacts: "לקוחות", deals: "נכסים", leads: "מתעניינים", companies: "יזמים", tasks: "ביקורים", tickets: "פניות" },
    dealStages: ["מתעניין", "ביקור ראשון", "ביקור שני", "הצעה", "משא ומתן", "נחתם", "בוטל"],
    contactStatuses: ["מתעניין", "פעיל", "רכש", "מושכר", "לא רלוונטי"],
  },
  agency: {
    name: "סוכנות פרסום",
    icon: "📢",
    description: "קמפיינרים, מדיה, קריאייטיב",
    moduleLabels: { contacts: "לקוחות", deals: "קמפיינים", leads: "לידים", companies: "מותגים", tasks: "משימות", tickets: "בקשות" },
    dealStages: ["בריף", "הצעה", "אישור", "הפקה", "פעיל", "סיום", "בוטל"],
    contactStatuses: ["פוטנציאלי", "פעיל", "VIP", "הוקפא", "עזב"],
  },
  recruitment: {
    name: "גיוס",
    icon: "👥",
    description: "HR, השמה, גיוס טכנולוגי",
    moduleLabels: { contacts: "מועמדים", deals: "משרות", leads: "מגויסים", companies: "חברות מגייסות", tasks: "ראיונות", tickets: "פניות" },
    dealStages: ["סינון", "ראיון טלפוני", "ראיון ראשון", "ראיון שני", "הצעה", "התחיל", "נדחה"],
    contactStatuses: ["מועמד", "בתהליך", "הוצע", "התקבל", "נדחה"],
  },
  coaching: {
    name: "אימון וייעוץ",
    icon: "🎯",
    description: "מאמנים, יועצים, מטפלים",
    moduleLabels: { contacts: "מטופלים", deals: "תוכניות", leads: "פניות", companies: "ארגונים", tasks: "מפגשים", tickets: "שאלות" },
    dealStages: ["פנייה", "שיחת היכרות", "הצעה", "פעיל", "הושלם", "בוטל"],
    contactStatuses: ["פנייה חדשה", "פעיל", "VIP", "סיים", "לא פעיל"],
  },
  ecommerce: {
    name: "מסחר אלקטרוני",
    icon: "🛒",
    description: "חנויות אונליין, D2C",
    moduleLabels: { contacts: "לקוחות", deals: "הזמנות", leads: "מתעניינים", companies: "ספקים", tasks: "משלוחים", tickets: "החזרות" },
    dealStages: ["עגלה", "הזמנה", "בתשלום", "נשלח", "הושלם", "ביטול"],
    contactStatuses: ["חדש", "פעיל", "VIP", "לא פעיל", "חסום"],
  },
  saas: {
    name: "SaaS / טכנולוגיה",
    icon: "💻",
    description: "חברות תוכנה, SaaS, סטארטאפים",
    moduleLabels: { contacts: "אנשי קשר", deals: "עסקאות", leads: "לידים", companies: "חשבונות", tasks: "משימות", tickets: "תמיכה טכנית" },
    dealStages: ["Discovery", "Demo", "POC", "Proposal", "Negotiation", "Closed Won", "Closed Lost"],
    contactStatuses: ["Trial", "Active", "Paying", "Churned", "Inactive"],
  },
  education: {
    name: "חינוך והכשרה",
    icon: "📚",
    description: "מכללות, קורסים, סדנאות",
    moduleLabels: { contacts: "תלמידים", deals: "הרשמות", leads: "מתעניינים", companies: "מוסדות", tasks: "שיעורים", tickets: "פניות" },
    dealStages: ["מתעניין", "ייעוץ", "הרשמה", "תשלום", "לומד", "סיים", "ביטול"],
    contactStatuses: ["מתעניין", "נרשם", "לומד", "בוגר", "עזב"],
  },
};

/** Colors to assign to deal stages and contact statuses. */
const STAGE_COLORS = ["#579BFC", "#A25DDC", "#6161FF", "#FDAB3D", "#FF642E", "#00CA72", "#FB275D", "#C4C4C4"];
const STATUS_COLORS = ["#579BFC", "#A25DDC", "#00CA72", "#FB275D", "#C4C4C4"];

function buildStageOptions(labels: string[]) {
  const result: Record<string, { label: string; color: string; order: number }> = {};
  const enumKeys = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];
  labels.forEach((label, i) => {
    const key = enumKeys[i] || `CUSTOM_${i}`;
    result[key] = { label, color: STAGE_COLORS[i % STAGE_COLORS.length], order: i };
  });
  return result;
}

function buildContactStatusOptions(labels: string[]) {
  const result: Record<string, { label: string; color: string; order: number }> = {};
  const enumKeys = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"];
  labels.forEach((label, i) => {
    const key = enumKeys[i] || `CUSTOM_${i}`;
    result[key] = { label, color: STATUS_COLORS[i % STATUS_COLORS.length], order: i };
  });
  return result;
}

export async function applyIndustryTemplate(workspaceId: string, templateId: string) {
  const template = INDUSTRY_TEMPLATES[templateId];
  if (!template) {
    throw new AppError(400, "INVALID_TEMPLATE", `Unknown template: ${templateId}`);
  }

  const customOptions: Record<string, any> = {
    dealStages: buildStageOptions(template.dealStages),
    contactStatuses: buildContactStatusOptions(template.contactStatuses),
  };

  return patchWorkspaceSettings(workspaceId, (existing) => {
    // Block re-applying a template once onboarding is complete — the
    // template wholesale-replaces customOptions and moduleLabels, so
    // re-running would silently destroy the user's customisations.
    if (existing.setupCompleted === true) {
      throw new AppError(
        409,
        "ALREADY_CONFIGURED",
        "Workspace already configured — delete and recreate the workspace to change template",
      );
    }

    return {
      customOptions,
      moduleLabels: template.moduleLabels,
      industryTemplate: templateId,
      setupCompleted: true,
    };
  });
}

export async function skipOnboarding(workspaceId: string) {
  return patchWorkspaceSettings(workspaceId, () => ({
    setupCompleted: true,
  }));
}

export async function getSetupStatus(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  return {
    setupCompleted: !!settings.setupCompleted,
    industryTemplate: settings.industryTemplate || null,
    moduleLabels: settings.moduleLabels || null,
  };
}

export async function updateWorkspaceOptions(
  workspaceId: string,
  customOptions: Record<string, any>,
) {
  // Block edits to system activity types
  if (customOptions.activityTypes) {
    for (const key of Object.keys(customOptions.activityTypes)) {
      if (SYSTEM_ACTIVITY_TYPES.has(key)) {
        throw new AppError(
          400,
          "INVALID_OPTION",
          `Cannot customize system type: ${key}`,
        );
      }
    }
  }

  const settings = await patchWorkspaceSettings(workspaceId, () => ({
    customOptions,
  }));
  return settings.customOptions || {};
}

// ─── Mention Dropdown Members ───

// 12-color palette used across the product for user avatars. Kept in sync
// with client/src/lib/utils.ts::AVATAR_COLORS so the server-rendered color
// matches the client. Deterministic hash → stable per-user.
const AVATAR_COLORS = [
  "#0073EA", "#00C875", "#FDAB3D", "#E2445C", "#A25DDC",
  "#037F4C", "#FFAD4A", "#579BFC", "#C4C4C4", "#784BD1",
  "#00CAD1", "#9D50DD",
];

function avatarColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export interface MentionableMember {
  id: string;           // workspaceMember.id — what we embed in @[name](id)
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl: string | null;
  role: string;
}

/**
 * Light-weight member list tailored for the @mention dropdown. Deliberately
 * narrower than getWorkspaceMembers — we only need rendering fields, not
 * invitedAt/joinedAt/lastActive. Capped at 500 to protect the dropdown from
 * very large workspaces (fuzzy-search happens client-side).
 */
export async function listMentionableMembers(
  workspaceId: string,
): Promise<MentionableMember[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { invitedAt: "asc" },
    take: 500,
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: avatarColorFromName(m.user.name || m.user.email),
    avatarUrl: m.user.avatarUrl,
    role: m.role,
  }));
}

// ─── Dashboard Layout (per workspace member) ───

export type DashboardWidgetSize = "small" | "medium" | "large";

export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
  size: DashboardWidgetSize;
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
}

/**
 * Registry of known widget ids. Keeping this on the server lets us
 * reject unknown ids in PUT requests (cheap guard against unbounded-
 * size JSON) while letting the client be the source of truth for
 * presentation (title, icon, component).
 */
export const KNOWN_DASHBOARD_WIDGETS = [
  "greeting",
  "stat-cards",
  "pipeline-chart",
  "activity-feed",
  "team-performance",
  "deals-at-risk",
  "my-tasks",
  "calendar",
  "todays-tasks",
] as const;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "greeting", visible: true, order: 0, size: "large" },
    { id: "stat-cards", visible: true, order: 1, size: "large" },
    { id: "pipeline-chart", visible: true, order: 2, size: "medium" },
    { id: "activity-feed", visible: true, order: 3, size: "medium" },
    { id: "team-performance", visible: true, order: 4, size: "large" },
    { id: "deals-at-risk", visible: true, order: 5, size: "large" },
    { id: "calendar", visible: true, order: 6, size: "large" },
    { id: "todays-tasks", visible: true, order: 7, size: "large" },
    { id: "my-tasks", visible: false, order: 8, size: "medium" },
  ],
};

function normalizeLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_DASHBOARD_LAYOUT;
  const obj = raw as Record<string, any>;
  const widgets = Array.isArray(obj.widgets) ? obj.widgets : null;
  if (!widgets) return DEFAULT_DASHBOARD_LAYOUT;

  const known = new Set<string>(KNOWN_DASHBOARD_WIDGETS as readonly string[]);
  const seen = new Set<string>();
  const cleaned: DashboardWidgetConfig[] = [];

  for (const w of widgets) {
    if (!w || typeof w !== "object") continue;
    const id = typeof w.id === "string" ? w.id : null;
    if (!id || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    const size: DashboardWidgetSize =
      w.size === "small" || w.size === "medium" || w.size === "large"
        ? w.size
        : "medium";
    cleaned.push({
      id,
      visible: w.visible !== false,
      order: Number.isFinite(w.order) ? Number(w.order) : cleaned.length,
      size,
    });
  }

  // Append any known widgets not present in the saved layout so new
  // widgets appear at the end (hidden-neutral) instead of vanishing.
  const defaultById = new Map(
    DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => [w.id, w]),
  );
  let nextOrder = cleaned.length;
  for (const id of KNOWN_DASHBOARD_WIDGETS) {
    if (seen.has(id)) continue;
    const def = defaultById.get(id)!;
    cleaned.push({ ...def, order: nextOrder++ });
  }

  // Ensure orders are contiguous 0..n-1 after sort.
  cleaned.sort((a, b) => a.order - b.order);
  cleaned.forEach((w, i) => (w.order = i));

  return { widgets: cleaned };
}

export async function getDashboardLayout(
  memberId: string,
): Promise<DashboardLayout> {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { settings: true },
  });
  if (!member) throw new AppError(404, "NOT_FOUND", "Member not found");

  const settings = (member.settings as Record<string, any>) || {};
  return normalizeLayout(settings.dashboardLayout);
}

export async function updateDashboardLayout(
  memberId: string,
  layout: DashboardLayout,
): Promise<DashboardLayout> {
  const normalized = normalizeLayout(layout);

  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.findUnique({
      where: { id: memberId },
      select: { settings: true },
    });
    if (!member) throw new AppError(404, "NOT_FOUND", "Member not found");

    const existing = (member.settings as Record<string, any>) || {};
    const nextSettings = { ...existing, dashboardLayout: normalized };
    await tx.workspaceMember.update({
      where: { id: memberId },
      data: { settings: nextSettings as any },
    });
    return normalized;
  });
}
