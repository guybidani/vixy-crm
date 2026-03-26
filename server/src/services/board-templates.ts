export interface BoardTemplateColumn {
  key: string;
  label: string;
  type: string;
  width?: string;
  options?: Array<{ key: string; label: string; color: string }>;
}

export interface BoardTemplate {
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultGroupName: string;
  columns: BoardTemplateColumn[];
}

export const BOARD_TEMPLATES: Record<string, BoardTemplate> = {
  blank: {
    name: "התחל מאפס",
    description: "בורד ריק — בנה את העמודות שלך",
    icon: "LayoutGrid",
    color: "#579BFC",
    defaultGroupName: "קבוצה חדשה",
    columns: [
      { key: "name", label: "שם", type: "TEXT" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "todo", label: "לביצוע", color: "#579BFC" },
          { key: "in_progress", label: "בתהליך", color: "#FDAB3D" },
          { key: "done", label: "הושלם", color: "#00CA72" },
          { key: "stuck", label: "תקוע", color: "#FB275D" },
        ],
      },
    ],
  },

  sales_pipeline: {
    name: "פייפליין מכירות",
    description: "נהל עסקאות ולידים לאורך כל מחזור המכירה",
    icon: "Handshake",
    color: "#00CA72",
    defaultGroupName: "עסקאות פתוחות",
    columns: [
      { key: "name", label: "שם לקוח", type: "TEXT" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "lead", label: "ליד", color: "#579BFC" },
          { key: "meeting", label: "פגישה", color: "#FDAB3D" },
          { key: "proposal", label: "הצעה", color: "#A25DDC" },
          { key: "closed", label: "סגור", color: "#00CA72" },
        ],
      },
      { key: "stage", label: "שלב", type: "TEXT", width: "120px" },
      { key: "value", label: "ערך עסקה", type: "NUMBER", width: "130px" },
      { key: "contact", label: "איש קשר", type: "TEXT", width: "140px" },
    ],
  },

  project_management: {
    name: "ניהול פרויקט",
    description: "עקוב אחר משימות, עדיפויות ואחריות הצוות",
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
    ],
  },

  lead_tracking: {
    name: "מעקב לידים",
    description: "קלוט לידים, עקוב אחר מקור ותזמן פגישות",
    icon: "Users",
    color: "#FDAB3D",
    defaultGroupName: "לידים חדשים",
    columns: [
      { key: "name", label: "שם", type: "TEXT" },
      { key: "source", label: "מקור", type: "TEXT", width: "120px" },
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
      { key: "meeting_date", label: "פגישה מתוכננת", type: "DATE", width: "150px" },
      { key: "notes", label: "הערות", type: "TEXT", width: "200px" },
    ],
  },

  weekly_tasks: {
    name: "לוח עבודה שבועי",
    description: "ארגן את משימות השבוע לפי יום ואחריות",
    icon: "Calendar",
    color: "#6161FF",
    defaultGroupName: "השבוע",
    columns: [
      { key: "task", label: "משימה", type: "TEXT" },
      { key: "day", label: "יום", type: "TEXT", width: "100px" },
      {
        key: "status",
        label: "סטטוס",
        type: "STATUS",
        width: "140px",
        options: [
          { key: "todo", label: "לביצוע", color: "#579BFC" },
          { key: "in_progress", label: "בתהליך", color: "#FDAB3D" },
          { key: "done", label: "הושלם", color: "#00CA72" },
        ],
      },
      { key: "assignee", label: "אחראי", type: "PERSON", width: "120px" },
    ],
  },
};
