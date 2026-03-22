import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

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
  return {
    customOptions: settings.customOptions || {},
    defaults: DEFAULT_OPTIONS,
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
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const existingSettings = (workspace.settings as Record<string, any>) || {};

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: {
        ...existingSettings,
        navPermissions,
      },
    },
    select: { settings: true },
  });

  return { navPermissions: ((updated.settings as Record<string, any>).navPermissions || {}) as Record<string, string[]> };
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

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  if (!workspace) throw new AppError(404, "NOT_FOUND", "Workspace not found");

  const existingSettings = (workspace.settings as Record<string, any>) || {};

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: {
        ...existingSettings,
        customOptions,
      },
    },
    select: { settings: true },
  });

  return (updated.settings as Record<string, any>).customOptions || {};
}
