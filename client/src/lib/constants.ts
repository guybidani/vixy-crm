// Navigation items - flat list (Monday-style, no sections)
export const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "דשבורד",
    icon: "LayoutDashboard",
    path: "/dashboard",
    dot: "#6161FF",
  },
  {
    key: "contacts",
    label: "אנשי קשר",
    icon: "Users",
    path: "/contacts",
    dot: "#6161FF",
  },
  {
    key: "companies",
    label: "חברות",
    icon: "Building2",
    path: "/companies",
    dot: "#579BFC",
  },
  {
    key: "deals",
    label: "עסקאות",
    icon: "Handshake",
    path: "/deals",
    dot: "#00CA72",
  },
  {
    key: "leads",
    label: "לידים",
    icon: "Inbox",
    path: "/leads",
    dot: "#FDAB3D",
  },
  {
    key: "tasks",
    label: "משימות",
    icon: "CheckSquare",
    path: "/tasks",
    dot: "#A25DDC",
  },
  {
    key: "tickets",
    label: "פניות",
    icon: "Ticket",
    path: "/tickets",
    dot: "#FB275D",
  },
  {
    key: "documents",
    label: "מסמכים",
    icon: "FileText",
    path: "/documents",
    dot: "#FF642E",
  },
  {
    key: "knowledge",
    label: "מאגר ידע",
    icon: "BookOpen",
    path: "/knowledge",
    dot: "#66CCFF",
  },
  {
    key: "automations",
    label: "אוטומציות",
    icon: "Zap",
    path: "/automations",
    dot: "#A25DDC",
  },
] as const;

// Legacy nav exports (keep for backward compat)
export const SALES_NAV = [
  { key: "dashboard", label: "דשבורד", icon: "LayoutDashboard", path: "/" },
  { key: "contacts", label: "אנשי קשר", icon: "Users", path: "/contacts" },
  { key: "companies", label: "חברות", icon: "Building2", path: "/companies" },
  { key: "deals", label: "עסקאות", icon: "Handshake", path: "/deals" },
  { key: "leads", label: "לידים", icon: "Inbox", path: "/leads" },
  { key: "tasks", label: "משימות", icon: "CheckSquare", path: "/tasks" },
] as const;

export const SUPPORT_NAV = [
  { key: "tickets", label: "פניות", icon: "Ticket", path: "/tickets" },
  { key: "knowledge", label: "מאגר ידע", icon: "BookOpen", path: "/knowledge" },
] as const;

export const SETTINGS_NAV = [
  { key: "settings", label: "הגדרות", icon: "Settings", path: "/settings" },
] as const;

// Deal stages - Monday-style vibrant colors
export const DEAL_STAGES = {
  LEAD: { label: "ליד", color: "#C4C4C4" },
  QUALIFIED: { label: "מוסמך", color: "#A25DDC" },
  PROPOSAL: { label: "הצעת מחיר", color: "#6161FF" },
  NEGOTIATION: { label: "משא ומתן", color: "#FDAB3D" },
  CLOSED_WON: { label: "נסגר - הצלחה", color: "#00CA72" },
  CLOSED_LOST: { label: "נסגר - הפסד", color: "#FB275D" },
} as const;

// Contact statuses
export const CONTACT_STATUSES = {
  LEAD: { label: "ליד", color: "#579BFC" },
  QUALIFIED: { label: "מוסמך", color: "#A25DDC" },
  CUSTOMER: { label: "לקוח", color: "#00CA72" },
  CHURNED: { label: "נטש", color: "#FB275D" },
  INACTIVE: { label: "לא פעיל", color: "#C4C4C4" },
} as const;

// Ticket statuses
export const TICKET_STATUSES = {
  NEW: { label: "חדש", color: "#579BFC" },
  OPEN: { label: "פתוח", color: "#FDAB3D" },
  PENDING: { label: "ממתין", color: "#FF642E" },
  RESOLVED: { label: "נפתר", color: "#00CA72" },
  CLOSED: { label: "סגור", color: "#C4C4C4" },
} as const;

// Company statuses
export const COMPANY_STATUSES = {
  PROSPECT: { label: "פוטנציאלי", color: "#579BFC" },
  ACTIVE: { label: "פעיל", color: "#00CA72" },
  INACTIVE: { label: "לא פעיל", color: "#C4C4C4" },
  CHURNED: { label: "נטש", color: "#FB275D" },
} as const;

// Priorities
export const PRIORITIES = {
  LOW: { label: "נמוך", color: "#66CCFF" },
  MEDIUM: { label: "בינוני", color: "#6161FF" },
  HIGH: { label: "גבוה", color: "#FDAB3D" },
  URGENT: { label: "דחוף", color: "#FB275D" },
} as const;

// Task statuses
export const TASK_STATUSES = {
  TODO: { label: "לביצוע", color: "#579BFC" },
  IN_PROGRESS: { label: "בתהליך", color: "#FDAB3D" },
  DONE: { label: "הושלם", color: "#00CA72" },
  CANCELLED: { label: "בוטל", color: "#C4C4C4" },
} as const;

// Activity types
export const ACTIVITY_TYPES = {
  NOTE: { label: "הערה", icon: "StickyNote", color: "#6161FF" },
  CALL: { label: "שיחה", icon: "Phone", color: "#00CA72" },
  EMAIL: { label: "אימייל", icon: "Mail", color: "#579BFC" },
  MEETING: { label: "פגישה", icon: "Calendar", color: "#A25DDC" },
  WHATSAPP: { label: "ווטסאפ", icon: "MessageCircle", color: "#25D366" },
  STATUS_CHANGE: { label: "שינוי סטטוס", icon: "ArrowRight", color: "#FDAB3D" },
  SYSTEM: { label: "מערכת", icon: "Bot", color: "#C4C4C4" },
} as const;

// Roles
export const ROLES = {
  OWNER: "בעלים",
  ADMIN: "מנהל",
  AGENT: "נציג",
} as const;
