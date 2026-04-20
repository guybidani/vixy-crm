import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

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
  // Wrap read-modify-write in a transaction to prevent concurrent updates
  // from overwriting each other's settings changes.
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    const newSettings = {
      ...existingSettings,
      snoozeOptions: snoozeOptions as unknown as Record<string, any>[],
    };

    return tx.workspace.update({
      where: { id: workspaceId },
      data: { settings: newSettings },
      select: { settings: true },
    });
  });

  return (updated.settings as Record<string, any>).snoozeOptions || DEFAULT_SNOOZE_OPTIONS;
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
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const settings = (workspace.settings as Record<string, any>) || {};
  const moduleLabelsOverrides = (settings.moduleLabels || {}) as Record<string, string>;
  return {
    customOptions: settings.customOptions || {},
    defaults: DEFAULT_OPTIONS,
    snoozeOptions: settings.snoozeOptions || DEFAULT_SNOOZE_OPTIONS,
    moduleLabels: { ...DEFAULT_MODULE_LABELS, ...moduleLabelsOverrides },
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
  // Wrap read-modify-write in a transaction to prevent concurrent updates
  // from overwriting each other's settings changes.
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    return tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...existingSettings,
          navPermissions,
        },
      },
      select: { settings: true },
    });
  });

  return { navPermissions: ((updated.settings as Record<string, any>).navPermissions || {}) as Record<string, string[]> };
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
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    // Only store overrides that differ from defaults
    const overrides: Record<string, string> = {};
    for (const [key, value] of Object.entries(moduleLabels)) {
      if (key in DEFAULT_MODULE_LABELS && value !== DEFAULT_MODULE_LABELS[key]) {
        overrides[key] = value;
      }
    }

    return tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...existingSettings,
          moduleLabels: overrides,
        },
      },
      select: { settings: true },
    });
  });

  const settings = (updated.settings as Record<string, any>) || {};
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

  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    return tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...existingSettings,
          customOptions,
          moduleLabels: template.moduleLabels,
          industryTemplate: templateId,
          setupCompleted: true,
        },
      },
      select: { settings: true },
    });
  });

  return updated.settings as Record<string, any>;
}

export async function skipOnboarding(workspaceId: string) {
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    return tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...existingSettings,
          setupCompleted: true,
        },
      },
      select: { settings: true },
    });
  });

  return updated.settings as Record<string, any>;
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

  // Wrap read-modify-write in a transaction to prevent concurrent updates
  // from overwriting each other's settings changes.
  const updated = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

    const existingSettings = (workspace.settings as Record<string, any>) || {};

    return tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...existingSettings,
          customOptions,
        },
      },
      select: { settings: true },
    });
  });

  return (updated.settings as Record<string, any>).customOptions || {};
}
