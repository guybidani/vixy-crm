/**
 * Monday.com-style automation recipe templates.
 *
 * Each recipe describes a human-readable sentence (Hebrew) with {{placeholder}}
 * tokens, plus a workflow template whose config strings may also reference those
 * tokens. When the user picks a recipe and fills in the blanks, we deep-replace
 * every occurrence of `{{key}}` in the template (name, condition values, action
 * config values) with the user-provided value, then POST the result to the
 * existing createWorkflow endpoint.
 *
 * IMPORTANT: all `trigger` strings here must match one of the server-side
 * WorkflowTrigger enum values (see server/src/routes/automation.routes.ts).
 */

export type RecipeCategory =
  | "status"
  | "deal"
  | "task"
  | "notification"
  | "date"
  | "form";

export type PlaceholderType =
  | "status" // contact status (from workspace contactStatuses)
  | "member" // workspace member id
  | "text" // free-text input
  | "stage" // deal stage (from workspace dealStages)
  | "priority" // priority level
  | "days" // number of days
  | "tag"; // tag name

export interface RecipePlaceholder {
  key: string;
  type: PlaceholderType;
  label: string;
  defaultValue?: string;
}

export interface RecipeTemplate {
  id: string;
  category: RecipeCategory;
  icon: string; // emoji shown in the card
  /** Human-readable sentence with {{placeholder}} tokens (Hebrew, RTL). */
  sentence: string;
  placeholders: RecipePlaceholder[];
  template: {
    name: string;
    trigger: string;
    conditions: Array<{ field: string; operator: string; value?: unknown }>;
    actions: Array<{
      type: string;
      config: Record<string, unknown>;
      order: number;
    }>;
  };
}

export const RECIPE_CATEGORIES = [
  { id: "status", label: "סטטוס", icon: "🔄", color: "#00C875" },
  { id: "deal", label: "עסקאות", icon: "🤝", color: "#0073EA" },
  { id: "task", label: "משימות", icon: "✅", color: "#A25DDC" },
  { id: "notification", label: "התראות", icon: "🔔", color: "#FDAB3D" },
  { id: "date", label: "תאריכים", icon: "📅", color: "#579BFC" },
  { id: "form", label: "טפסים", icon: "📝", color: "#FF642E" },
] as const satisfies ReadonlyArray<{
  id: RecipeCategory;
  label: string;
  icon: string;
  color: string;
}>;

export const RECIPE_TEMPLATES: RecipeTemplate[] = [
  // ── Status automations ─────────────────────────────────────────
  {
    id: "notify-on-status-change",
    category: "status",
    icon: "🔔",
    sentence:
      "כאשר סטטוס של איש קשר משתנה ל-{{status}}, שלח התראה ל-{{member}}",
    placeholders: [
      { key: "status", type: "status", label: "סטטוס" },
      { key: "member", type: "member", label: "חבר צוות" },
    ],
    template: {
      name: "התראה בשינוי סטטוס",
      trigger: "CONTACT_STATUS_CHANGED",
      conditions: [
        { field: "status", operator: "equals", value: "{{status}}" },
      ],
      actions: [
        {
          type: "SEND_NOTIFICATION",
          config: {
            memberId: "{{member}}",
            title: "סטטוס השתנה",
            body: "איש הקשר {{firstName}} {{lastName}} עבר לסטטוס {{status}}",
          },
          order: 0,
        },
      ],
    },
  },

  // ── Deal stage automations ─────────────────────────────────────
  {
    id: "task-on-deal-stage",
    category: "deal",
    icon: "✅",
    sentence:
      "כאשר שלב עסקה משתנה ל-{{stage}}, צור משימה ל-{{member}}: {{taskTitle}}",
    placeholders: [
      { key: "stage", type: "stage", label: "שלב" },
      { key: "member", type: "member", label: "חבר צוות" },
      {
        key: "taskTitle",
        type: "text",
        label: "כותרת משימה",
        defaultValue: "מעקב אחרי עסקה",
      },
    ],
    template: {
      name: "משימה בשינוי שלב",
      trigger: "DEAL_STAGE_CHANGED",
      conditions: [{ field: "stage", operator: "equals", value: "{{stage}}" }],
      actions: [
        {
          type: "CREATE_TASK",
          config: {
            assigneeId: "{{member}}",
            title: "{{taskTitle}}",
            priority: "HIGH",
            dueDays: 3,
          },
          order: 0,
        },
      ],
    },
  },

  // ── Lead scoring automation ────────────────────────────────────
  {
    id: "qualify-high-score",
    category: "status",
    icon: "🎯",
    sentence:
      "כאשר ציון ליד של איש קשר עובר {{score}}, שנה סטטוס ל-{{newStatus}}",
    placeholders: [
      { key: "score", type: "text", label: "ציון", defaultValue: "80" },
      { key: "newStatus", type: "status", label: "סטטוס חדש" },
    ],
    template: {
      name: "הסמכה אוטומטית של לידים חמים",
      trigger: "LEAD_SCORE_CHANGED",
      conditions: [
        { field: "leadScore", operator: "greater_than", value: "{{score}}" },
      ],
      actions: [
        {
          type: "CHANGE_FIELD",
          config: {
            entityType: "contact",
            field: "status",
            value: "{{newStatus}}",
          },
          order: 0,
        },
      ],
    },
  },

  // ── Welcome email ──────────────────────────────────────────────
  {
    id: "welcome-new-contact",
    category: "notification",
    icon: "📧",
    sentence: "כאשר איש קשר חדש נוצר, שלח אימייל ברוכים הבאים: {{subject}}",
    placeholders: [
      {
        key: "subject",
        type: "text",
        label: "נושא",
        defaultValue: "ברוך הבא!",
      },
    ],
    template: {
      name: "ברוכים הבאים ללידים חדשים",
      trigger: "CONTACT_CREATED",
      conditions: [],
      actions: [
        {
          type: "SEND_EMAIL",
          config: {
            subject: "{{subject}}",
            body: "היי {{firstName}}, תודה שנרשמת! נחזור אליך בהקדם.",
          },
          order: 0,
        },
      ],
    },
  },

  // ── Tag high-value deals ───────────────────────────────────────
  {
    id: "tag-big-deal",
    category: "deal",
    icon: "🏷️",
    sentence:
      'כאשר עסקה חדשה נוצרת בשווי מעל {{value}} ש"ח, הוסף תגית {{tag}}',
    placeholders: [
      { key: "value", type: "text", label: "שווי", defaultValue: "50000" },
      { key: "tag", type: "tag", label: "תגית" },
    ],
    template: {
      name: "תיוג עסקאות VIP",
      trigger: "DEAL_CREATED",
      conditions: [
        { field: "value", operator: "greater_than", value: "{{value}}" },
      ],
      actions: [
        {
          type: "ADD_TAG",
          config: { tagName: "{{tag}}", entityType: "deal" },
          order: 0,
        },
      ],
    },
  },

  // ── Task assigned notification ─────────────────────────────────
  {
    id: "task-assigned-alert",
    category: "task",
    icon: "⏰",
    sentence: "כאשר משימה חדשה נוצרת, שלח התראה למוקצה",
    placeholders: [],
    template: {
      name: "התראה על משימה חדשה",
      trigger: "TASK_CREATED",
      conditions: [],
      actions: [
        {
          type: "SEND_NOTIFICATION",
          config: {
            memberId: "{{assigneeId}}",
            title: "משימה ממתינה",
            body: "משימה חדשה הוקצתה לך",
          },
          order: 0,
        },
      ],
    },
  },

  // ── Auto-assign deals ──────────────────────────────────────────
  {
    id: "auto-assign-deal",
    category: "deal",
    icon: "👤",
    sentence: "כאשר עסקה חדשה נוצרת, הקצה ל-{{member}}",
    placeholders: [{ key: "member", type: "member", label: "חבר צוות" }],
    template: {
      name: "הקצאה אוטומטית של עסקאות חדשות",
      trigger: "DEAL_CREATED",
      conditions: [],
      actions: [
        {
          type: "ASSIGN_OWNER",
          config: { memberId: "{{member}}", entityType: "deal" },
          order: 0,
        },
      ],
    },
  },

  // ── Ticket urgent alert ────────────────────────────────────────
  {
    id: "urgent-ticket-alert",
    category: "notification",
    icon: "🚨",
    sentence: "כאשר קריאה דחופה נפתחת, שלח התראה לכל הצוות",
    placeholders: [],
    template: {
      name: "התראה על קריאה דחופה",
      trigger: "TICKET_CREATED",
      conditions: [
        { field: "priority", operator: "equals", value: "URGENT" },
      ],
      actions: [
        {
          type: "SEND_NOTIFICATION",
          config: {
            memberId: "*",
            title: "קריאה דחופה!",
            body: "קריאה דחופה חדשה: {{subject}}",
          },
          order: 0,
        },
      ],
    },
  },
];

// ── Placeholder substitution helpers ─────────────────────────────

/**
 * Replace every `{{key}}` occurrence in a string using the provided map.
 * Keys not present in the map are left as-is (they may be runtime fields
 * resolved by the workflow engine like {{firstName}}, {{assigneeId}}, etc.).
 */
function substituteString(
  input: string,
  values: Record<string, string>,
): string {
  return input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? values[key]
      : match;
  });
}

/**
 * Deep-walk a value replacing `{{key}}` in every string, using values from
 * the provided map. Preserves non-string primitives and object shape.
 */
export function substituteDeep<T>(value: T, values: Record<string, string>): T {
  if (typeof value === "string") {
    return substituteString(value, values) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => substituteDeep(v, values)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteDeep(v, values);
    }
    return out as T;
  }
  return value;
}

/**
 * Build the final workflow payload from a recipe + user-filled placeholder
 * values. The result is ready to be posted to createWorkflow().
 */
export function buildWorkflowFromRecipe(
  recipe: RecipeTemplate,
  values: Record<string, string>,
) {
  const tmpl = recipe.template;
  return {
    name: substituteString(tmpl.name, values),
    trigger: tmpl.trigger,
    conditions: tmpl.conditions.map((c) => substituteDeep(c, values)),
    actions: tmpl.actions.map((a, i) => ({
      type: a.type,
      config: substituteDeep(a.config, values),
      order: a.order ?? i,
    })),
  };
}
