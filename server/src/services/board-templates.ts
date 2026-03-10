export interface BoardTemplateColumn {
  key: string;
  label: string;
  type: string;
  width?: string;
  options?: Array<{ key: string; label: string; color: string }>;
}

export interface BoardTemplate {
  name: string;
  icon: string;
  color: string;
  defaultGroupName: string;
  columns: BoardTemplateColumn[];
}

export const BOARD_TEMPLATES: Record<string, BoardTemplate> = {
  lead_management: {
    name: "ניהול לידים",
    icon: "Users",
    color: "#FDAB3D",
    defaultGroupName: "לידים חדשים",
    columns: [
      { key: "name", label: "שם", type: "TEXT" },
      { key: "phone", label: "טלפון", type: "PHONE", width: "130px" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "new", label: "חדש", color: "#579BFC" },
          { key: "contacted", label: "יצרנו קשר", color: "#FDAB3D" },
          { key: "interested", label: "מעוניין", color: "#00CA72" },
          { key: "not_interested", label: "לא מעוניין", color: "#FB275D" },
        ],
      },
      { key: "source", label: "מקור", type: "TEXT", width: "120px" },
      { key: "notes", label: "הערות", type: "TEXT", width: "200px" },
      { key: "assignee", label: "אחראי", type: "PERSON", width: "120px" },
    ],
  },

  sales_tracking: {
    name: "מעקב מכירות",
    icon: "Handshake",
    color: "#00CA72",
    defaultGroupName: "עסקאות פתוחות",
    columns: [
      { key: "deal", label: "עסקה", type: "TEXT" },
      { key: "value", label: "סכום", type: "NUMBER", width: "120px" },
      {
        key: "stage",
        label: "שלב",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "lead", label: "ליד", color: "#C4C4C4" },
          { key: "proposal", label: "הצעה", color: "#6161FF" },
          { key: "negotiation", label: "משא ומתן", color: "#FDAB3D" },
          { key: "won", label: "נסגר", color: "#00CA72" },
          { key: "lost", label: "הפסד", color: "#FB275D" },
        ],
      },
      { key: "contact", label: "איש קשר", type: "TEXT", width: "140px" },
      { key: "close_date", label: "תאריך סגירה", type: "DATE", width: "130px" },
      { key: "probability", label: "סיכוי", type: "NUMBER", width: "100px" },
    ],
  },

  project_management: {
    name: "ניהול פרויקט",
    icon: "CheckSquare",
    color: "#A25DDC",
    defaultGroupName: "לביצוע",
    columns: [
      { key: "task", label: "משימה", type: "TEXT" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "todo", label: "לביצוע", color: "#579BFC" },
          { key: "in_progress", label: "בתהליך", color: "#FDAB3D" },
          { key: "review", label: "בבדיקה", color: "#A25DDC" },
          { key: "done", label: "הושלם", color: "#00CA72" },
        ],
      },
      {
        key: "priority",
        label: "עדיפות",
        type: "PRIORITY",
        width: "120px",
        options: [
          { key: "low", label: "נמוך", color: "#66CCFF" },
          { key: "medium", label: "בינוני", color: "#6161FF" },
          { key: "high", label: "גבוה", color: "#FDAB3D" },
          { key: "urgent", label: "דחוף", color: "#FB275D" },
        ],
      },
      { key: "assignee", label: "אחראי", type: "PERSON", width: "120px" },
      { key: "due_date", label: "תאריך יעד", type: "DATE", width: "130px" },
      { key: "progress", label: "התקדמות", type: "NUMBER", width: "100px" },
    ],
  },

  basic_crm: {
    name: "CRM בסיסי",
    icon: "Users",
    color: "#6161FF",
    defaultGroupName: "אנשי קשר",
    columns: [
      { key: "name", label: "שם", type: "TEXT" },
      { key: "email", label: "אימייל", type: "EMAIL", width: "180px" },
      { key: "phone", label: "טלפון", type: "PHONE", width: "130px" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "active", label: "פעיל", color: "#00CA72" },
          { key: "inactive", label: "לא פעיל", color: "#C4C4C4" },
          { key: "vip", label: "VIP", color: "#FDAB3D" },
        ],
      },
      { key: "company", label: "חברה", type: "TEXT", width: "140px" },
      { key: "notes", label: "הערות", type: "TEXT", width: "200px" },
    ],
  },

  blank: {
    name: "בורד ריק",
    icon: "LayoutGrid",
    color: "#579BFC",
    defaultGroupName: "קבוצה חדשה",
    columns: [{ key: "name", label: "שם", type: "TEXT" }],
  },
};
