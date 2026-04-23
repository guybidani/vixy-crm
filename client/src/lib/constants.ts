// Navigation items - flat list (Monday-style, no sections)
export const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "דשבורד",
    icon: "LayoutDashboard",
    path: "/dashboard",
    dot: "#0073EA",
  },
  {
    key: "contacts",
    label: "אנשי קשר",
    icon: "Users",
    path: "/contacts",
    dot: "#0073EA",
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
    dot: "#00C875",
  },
  {
    key: "leads",
    label: "לידים",
    icon: "Inbox",
    path: "/leads",
    dot: "#FDAB3D",
  },
  {
    key: "reports",
    label: "דוחות",
    icon: "BarChart2",
    path: "/reports",
    dot: "#0073EA",
  },
  {
    key: "tasks",
    label: "משימות",
    icon: "CheckSquare",
    path: "/tasks",
    dot: "#A25DDC",
  },
  {
    key: "history",
    label: "היסטוריה",
    icon: "Clock",
    path: "/history",
    dot: "#FF642E",
  },
  {
    key: "analytics",
    label: "ניתוחים",
    icon: "BarChart3",
    path: "/analytics",
    dot: "#0073EA",
  },
  {
    key: "tickets",
    label: "קריאות",
    icon: "Headphones",
    path: "/tickets",
    dot: "#E2445C",
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
    key: "templates",
    label: "תבניות",
    icon: "FileText",
    path: "/templates",
    dot: "#FF642E",
  },
  {
    key: "automations",
    label: "אוטומציות",
    icon: "Zap",
    path: "/automations",
    dot: "#A25DDC",
  },
  {
    key: "import",
    label: "ייבוא",
    icon: "Upload",
    path: "/import",
    dot: "#579BFC",
  },
] as const;

// Deal stages - Monday-style vibrant colors
export const DEAL_STAGES = {
  LEAD: { label: "ליד", color: "#C4C4C4" },
  QUALIFIED: { label: "מוסמך", color: "#A25DDC" },
  PROPOSAL: { label: "הצעת מחיר", color: "#0073EA" },
  NEGOTIATION: { label: "משא ומתן", color: "#FDAB3D" },
  CLOSED_WON: { label: "נסגר - הצלחה", color: "#00C875" },
  CLOSED_LOST: { label: "נסגר - הפסד", color: "#E2445C" },
} as const;

// Contact statuses
export const CONTACT_STATUSES = {
  LEAD: { label: "ליד", color: "#579BFC" },
  QUALIFIED: { label: "מוסמך", color: "#A25DDC" },
  CUSTOMER: { label: "לקוח", color: "#00C875" },
  CHURNED: { label: "נטש", color: "#E2445C" },
  INACTIVE: { label: "לא פעיל", color: "#C4C4C4" },
} as const;

// Ticket statuses
export const TICKET_STATUSES = {
  NEW: { label: "חדש", color: "#579BFC" },
  OPEN: { label: "פתוח", color: "#FDAB3D" },
  PENDING: { label: "ממתין", color: "#FF642E" },
  RESOLVED: { label: "נפתר", color: "#00C875" },
  CLOSED: { label: "סגור", color: "#C4C4C4" },
} as const;

// Company statuses
export const COMPANY_STATUSES = {
  PROSPECT: { label: "פוטנציאלי", color: "#579BFC" },
  ACTIVE: { label: "פעיל", color: "#00C875" },
  INACTIVE: { label: "לא פעיל", color: "#C4C4C4" },
  CHURNED: { label: "נטש", color: "#E2445C" },
} as const;

// Priorities - Monday-exact palette (see lib/monday-palette.ts)
export const PRIORITIES = {
  LOW: { label: "נמוך", color: "#C5C7D0" }, // Monday "Low" gray
  MEDIUM: { label: "בינוני", color: "#579BFC" }, // Dark blue
  HIGH: { label: "גבוה", color: "#FF642E" }, // Orange
  URGENT: { label: "דחוף", color: "#E2445C" }, // Red
} as const;

// Task statuses
export const TASK_STATUSES = {
  TODO: { label: "לביצוע", color: "#579BFC" },
  IN_PROGRESS: { label: "בתהליך", color: "#FDAB3D" },
  DONE: { label: "הושלם", color: "#00C875" },
  CANCELLED: { label: "בוטל", color: "#C4C4C4" },
} as const;

// Activity types
export const ACTIVITY_TYPES = {
  NOTE: { label: "הערה", icon: "StickyNote", color: "#0073EA" },
  CALL: { label: "שיחה", icon: "Phone", color: "#00C875" },
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
