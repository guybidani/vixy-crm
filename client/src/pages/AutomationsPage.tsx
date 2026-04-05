import { useState } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Plus,
  Zap,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import PageShell, {
  PageCard,
  EmptyState,
} from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import {
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  type Workflow,
} from "../api/automations";
import { cn } from "../lib/utils";

// ─── Constants ───

const TRIGGERS: Record<string, { label: string; description: string }> = {
  DEAL_STAGE_CHANGED: {
    label: "שלב עסקה השתנה",
    description: "כשעסקה עוברת משלב לשלב",
  },
  DEAL_CREATED: { label: "עסקה נוצרה", description: "כשנוצרת עסקה חדשה" },
  CONTACT_CREATED: {
    label: "איש קשר נוצר",
    description: "כשנוצר איש קשר חדש",
  },
  CONTACT_STATUS_CHANGED: {
    label: "סטטוס איש קשר השתנה",
    description: "כשסטטוס איש קשר משתנה",
  },
  TASK_CREATED: { label: "משימה נוצרה", description: "כשנוצרת משימה חדשה" },
  TASK_COMPLETED: {
    label: "משימה הושלמה",
    description: "כשמשימה מסומנת כבוצעה",
  },
  TICKET_CREATED: { label: "פנייה נוצרה", description: "כשנוצרת פנייה חדשה" },
  TICKET_STATUS_CHANGED: {
    label: "סטטוס פנייה השתנה",
    description: "כשסטטוס פנייה משתנה",
  },
  LEAD_SCORE_CHANGED: {
    label: "ניקוד ליד השתנה",
    description: "כשמשתנה ניקוד הליד",
  },
};

const ACTION_TYPES: Record<string, { label: string; description: string }> = {
  SEND_NOTIFICATION: {
    label: "שלח התראה",
    description: "שלח התראה למשתמשים",
  },
  CREATE_TASK: { label: "צור משימה", description: "צור משימה אוטומטית" },
  CHANGE_FIELD: { label: "שנה שדה", description: "שנה ערך בישות" },
  SEND_EMAIL: {
    label: "שלח אימייל",
    description: "שלח אימייל אוטומטי (פעילות)",
  },
  ADD_TAG: { label: "הוסף תגית", description: "הוסף תגית לאיש קשר" },
  MOVE_STAGE: { label: "העבר שלב", description: "העבר עסקה לשלב אחר" },
  ASSIGN_OWNER: { label: "שייך בעלים", description: "שייך אחראי לישות" },
};

const CONDITION_OPERATORS: Record<string, string> = {
  equals: "שווה ל",
  not_equals: "לא שווה ל",
  contains: "מכיל",
  greater_than: "גדול מ",
  less_than: "קטן מ",
  changed_to: "השתנה ל",
  changed_from: "השתנה מ",
  is_empty: "ריק",
  is_not_empty: "לא ריק",
};

// ─── Workflow Dialog ───

interface WorkflowFormData {
  name: string;
  description: string;
  trigger: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: Record<string, any> }[];
}

const EMPTY_FORM: WorkflowFormData = {
  name: "",
  description: "",
  trigger: "",
  conditions: [],
  actions: [{ type: "SEND_NOTIFICATION", config: { title: "", body: "" } }],
};

function WorkflowDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: Workflow;
  onSave: (data: WorkflowFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<WorkflowFormData>(
    initial
      ? {
          name: initial.name,
          description: initial.description || "",
          trigger: initial.trigger,
          conditions: Array.isArray(initial.conditions)
            ? initial.conditions
            : [],
          actions: initial.actions.map((a) => ({
            type: a.type,
            config: a.config as Record<string, any>,
          })),
        }
      : EMPTY_FORM,
  );

  const addCondition = () =>
    setForm((f) => ({
      ...f,
      conditions: [
        ...f.conditions,
        { field: "", operator: "equals", value: "" },
      ],
    }));

  const removeCondition = (i: number) =>
    setForm((f) => ({
      ...f,
      conditions: f.conditions.filter((_, idx) => idx !== i),
    }));

  const updateCondition = (i: number, key: string, val: string) =>
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, idx) =>
        idx === i ? { ...c, [key]: val } : c,
      ),
    }));

  const addAction = () =>
    setForm((f) => ({
      ...f,
      actions: [
        ...f.actions,
        { type: "SEND_NOTIFICATION", config: { title: "", body: "" } },
      ],
    }));

  const removeAction = (i: number) =>
    setForm((f) => ({
      ...f,
      actions: f.actions.filter((_, idx) => idx !== i),
    }));

  const updateAction = (i: number, key: string, val: any) =>
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, idx) =>
        idx === i ? { ...a, [key]: val } : a,
      ),
    }));

  const updateActionConfig = (i: number, configKey: string, val: any) =>
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, idx) =>
        idx === i ? { ...a, config: { ...a.config, [configKey]: val } } : a,
      ),
    }));

  const canSave = form.name && form.trigger && form.actions.length > 0;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={initial ? "ערוך אוטומציה" : "אוטומציה חדשה"}
      maxWidth="max-w-2xl"
      className="max-h-[90vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Name & Description */}
        <div className="space-y-3">
          <div>
            <label className="text-[13px] font-medium text-[#323338] block mb-1">
              שם
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="לדוגמה: שלח התראה כשעסקה נסגרת"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] outline-none"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-[#323338] block mb-1">
              תיאור (אופציונלי)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] outline-none"
            />
          </div>
        </div>

        {/* Trigger */}
        <div>
          <label className="text-[13px] font-bold text-[#323338] block mb-2">
            <Zap size={14} className="inline ml-1 text-purple-500" />
            טריגר - מתי להפעיל?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TRIGGERS).map(([key, { label, description }]) => (
              <button
                key={key}
                onClick={() => setForm((f) => ({ ...f, trigger: key }))}
                className={cn(
                  "text-right p-3 rounded-[4px] border transition-all text-[13px]",
                  form.trigger === key
                    ? "border-[#0073EA] bg-[#0073EA]/5 ring-1 ring-[#0073EA]/20"
                    : "border-[#E6E9EF] hover:border-[#0073EA]/30 hover:bg-[#F5F6F8]",
                )}
              >
                <div className="font-medium text-[#323338]">{label}</div>
                <div className="text-[12px] text-[#9699A6] mt-0.5">
                  {description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-bold text-[#323338]">
              תנאים (אופציונלי)
            </label>
            <button
              onClick={addCondition}
              className="text-xs text-[#0073EA] hover:text-[#0060C2] flex items-center gap-1"
            >
              <Plus size={12} />
              הוסף תנאי
            </button>
          </div>
          {form.conditions.length === 0 ? (
            <p className="text-[12px] text-[#9699A6]">
              ללא תנאים — הטריגר יפעל תמיד
            </p>
          ) : (
            <div className="space-y-2">
              {form.conditions.map((cond, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-[#F5F6F8] rounded-[4px]"
                >
                  <input
                    type="text"
                    value={cond.field}
                    onChange={(e) =>
                      updateCondition(i, "field", e.target.value)
                    }
                    placeholder="שדה (stage, status...)"
                    className="flex-1 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) =>
                      updateCondition(i, "operator", e.target.value)
                    }
                    className="px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                  >
                    {Object.entries(CONDITION_OPERATORS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) =>
                      updateCondition(i, "value", e.target.value)
                    }
                    placeholder="ערך"
                    className="flex-1 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                  />
                  <button
                    onClick={() => removeCondition(i)}
                    className="p-1 text-[#9699A6] hover:text-[#E44258]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-bold text-[#323338]">
              <Play size={14} className="inline ml-1 text-green-500" />
              פעולות - מה לעשות?
            </label>
            <button
              onClick={addAction}
              className="text-xs text-[#0073EA] hover:text-[#0060C2] flex items-center gap-1"
            >
              <Plus size={12} />
              הוסף פעולה
            </button>
          </div>
          <div className="space-y-3">
            {form.actions.map((action, i) => (
              <div
                key={i}
                className="p-3 border border-[#E6E9EF] rounded-[4px] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(i, "type", e.target.value)}
                    className="px-2 py-1.5 border border-[#E6E9EF] rounded text-[13px] bg-white font-medium"
                  >
                    {Object.entries(ACTION_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  {form.actions.length > 1 && (
                    <button
                      onClick={() => removeAction(i)}
                      className="p-1 text-[#9699A6] hover:text-[#E44258]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Action-specific config */}
                {action.type === "SEND_NOTIFICATION" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={action.config.title || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "title", e.target.value)
                      }
                      placeholder="כותרת ההתראה (תמיכה ב-{{field}})"
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <input
                      type="text"
                      value={action.config.body || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "body", e.target.value)
                      }
                      placeholder="תוכן ההתראה"
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                  </div>
                )}

                {action.type === "CREATE_TASK" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={action.config.title || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "title", e.target.value)
                      }
                      placeholder="כותרת המשימה"
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <input
                      type="text"
                      value={action.config.description || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "description", e.target.value)
                      }
                      placeholder="תיאור (אופציונלי)"
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <div className="flex gap-2">
                      <select
                        value={action.config.priority || "MEDIUM"}
                        onChange={(e) =>
                          updateActionConfig(i, "priority", e.target.value)
                        }
                        className="px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                      >
                        <option value="LOW">נמוכה</option>
                        <option value="MEDIUM">בינונית</option>
                        <option value="HIGH">גבוהה</option>
                        <option value="URGENT">דחופה</option>
                      </select>
                      <input
                        type="number"
                        value={action.config.dueDays || ""}
                        onChange={(e) =>
                          updateActionConfig(i, "dueDays", e.target.value)
                        }
                        placeholder="ימים לביצוע"
                        className="w-32 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                      />
                    </div>
                  </div>
                )}

                {action.type === "CHANGE_FIELD" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={action.config.field || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "field", e.target.value)
                      }
                      placeholder="שם השדה (status, priority...)"
                      className="flex-1 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <input
                      type="text"
                      value={action.config.value || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "value", e.target.value)
                      }
                      placeholder="ערך חדש"
                      className="flex-1 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                  </div>
                )}

                {action.type === "MOVE_STAGE" && (
                  <select
                    value={action.config.stage || ""}
                    onChange={(e) =>
                      updateActionConfig(i, "stage", e.target.value)
                    }
                    className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                  >
                    <option value="">בחר שלב</option>
                    <option value="LEAD">ליד</option>
                    <option value="QUALIFIED">מוסמך</option>
                    <option value="PROPOSAL">הצעה</option>
                    <option value="NEGOTIATION">משא ומתן</option>
                    <option value="CLOSED_WON">סגור - ניצחון</option>
                    <option value="CLOSED_LOST">סגור - הפסד</option>
                  </select>
                )}

                {action.type === "SEND_EMAIL" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={action.config.subject || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "subject", e.target.value)
                      }
                      placeholder="נושא האימייל"
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <textarea
                      value={action.config.body || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "body", e.target.value)
                      }
                      placeholder="תוכן האימייל"
                      rows={3}
                      className="w-full px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white resize-none"
                    />
                  </div>
                )}

                {action.type === "ADD_TAG" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={action.config.tagName || ""}
                      onChange={(e) =>
                        updateActionConfig(i, "tagName", e.target.value)
                      }
                      placeholder="שם התגית"
                      className="flex-1 px-2 py-1.5 border border-[#E6E9EF] rounded text-[12px] bg-white"
                    />
                    <input
                      type="color"
                      value={action.config.tagColor || "#0073EA"}
                      onChange={(e) =>
                        updateActionConfig(i, "tagColor", e.target.value)
                      }
                      className="w-10 h-8 p-0.5 border border-[#E6E9EF] rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E6E9EF]">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338]"
        >
          ביטול
        </button>
        <button
          onClick={() => canSave && onSave(form)}
          disabled={!canSave}
          className="px-6 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initial ? "שמור שינויים" : "צור אוטומציה"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Page Component ───

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["automations"],
    queryFn: () => listWorkflows(),
  });

  const createMut = useMutation({
    mutationFn: (d: WorkflowFormData) =>
      createWorkflow({
        name: d.name,
        description: d.description || undefined,
        trigger: d.trigger,
        conditions: d.conditions.length > 0 ? d.conditions : undefined,
        actions: d.actions.map((a, i) => ({
          type: a.type,
          config: a.config,
          order: i,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      setDialogOpen(false);
      toast.success("אוטומציה נוצרה בהצלחה!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה ביצירת אוטומציה");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: WorkflowFormData }) =>
      updateWorkflow(id, {
        name: d.name,
        description: d.description || undefined,
        trigger: d.trigger,
        conditions: d.conditions.length > 0 ? d.conditions : undefined,
        actions: d.actions.map((a, i) => ({
          type: a.type,
          config: a.config,
          order: i,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      setEditing(null);
      toast.success("אוטומציה עודכנה בהצלחה!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה בעדכון אוטומציה");
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleWorkflow(id, isActive),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success(variables.isActive ? "אוטומציה הופעלה" : "אוטומציה כובתה");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה בשינוי סטטוס");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("אוטומציה נמחקה");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה במחיקת אוטומציה");
    },
  });

  const workflows = data?.data ?? [];

  return (
    <PageShell
      boardStyle
      emoji="⚡"
      title="אוטומציות"
      subtitle="הגדר טריגרים ופעולות אוטומטיות לתהליכי העבודה שלך"
      actions={
        <button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          אוטומציה חדשה
        </button>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-[#E44258]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת אוטומציות</h2>
          <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את האוטומציות. נסו שוב.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
          >
            <RefreshCw size={14} />
            נסה שוב
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <PageCard key={i} className="!p-0 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-7 h-5 bg-[#F5F6F8] rounded" />
                <div className="w-10 h-10 rounded-xl bg-[#F5F6F8]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F5F6F8] rounded w-1/3" />
                  <div className="h-3 bg-[#F5F6F8] rounded w-1/2" />
                </div>
              </div>
            </PageCard>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <PageCard>
          <EmptyState
            icon={<Zap size={32} className="text-purple-400" />}
            title="אין אוטומציות עדיין"
            description="צור אוטומציה ראשונה כדי לייעל את תהליכי העבודה. לדוגמה: שלח התראה כשעסקה עוברת לשלב חדש."
            action={
              <button
                onClick={() => setDialogOpen(true)}
                className="px-6 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all"
              >
                צור אוטומציה
              </button>
            }
          />
        </PageCard>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => {
            const triggerInfo = TRIGGERS[w.trigger];
            const isExpanded = expandedId === w.id;
            return (
              <PageCard key={w.id} className="!p-0 overflow-hidden">
                {/* Main row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Toggle */}
                  <button
                    onClick={() =>
                      toggleMut.mutate({ id: w.id, isActive: !w.isActive })
                    }
                    className={cn(
                      "transition-colors",
                      w.isActive ? "text-green-500" : "text-gray-300",
                    )}
                    title={
                      w.isActive ? "פעיל - לחץ לכיבוי" : "כבוי - לחץ להפעלה"
                    }
                  >
                    {w.isActive ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} />
                    )}
                  </button>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0">
                    <Zap size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#323338] text-[13px] truncate">
                        {w.name}
                      </h3>
                      {!w.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          כבוי
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[12px] text-[#9699A6]">
                      <span className="text-purple-600 font-medium">
                        {triggerInfo?.label || w.trigger}
                      </span>
                      <span>{w.actions.length} פעולות</span>
                      {w.totalRuns !== undefined && (
                        <span className="flex items-center gap-1">
                          <Activity size={10} />
                          {w.totalRuns} הפעלות
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(w);
                        setDialogOpen(true);
                      }}
                      className="p-2 rounded-[4px] hover:bg-[#F5F6F8] text-[#9699A6] transition-colors"
                      title="ערוך"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setAutomationToDelete(w.id)}
                      className="p-2 rounded-[4px] hover:bg-red-50 text-[#9699A6] hover:text-[#E44258] transition-colors"
                      title="מחק"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : w.id)}
                      className="p-2 rounded-[4px] hover:bg-[#F5F6F8] text-[#9699A6] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-0 border-t border-[#E6E9EF]">
                    <div className="pt-3 space-y-3">
                      {w.description && (
                        <p className="text-[13px] text-[#676879]">
                          {w.description}
                        </p>
                      )}

                      {/* Conditions */}
                      {Array.isArray(w.conditions) &&
                        w.conditions.length > 0 && (
                          <div>
                            <h4 className="text-[12px] font-bold text-[#323338] mb-1">
                              תנאים:
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(w.conditions as any[]).map(
                                (c: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full"
                                  >
                                    {c.field}{" "}
                                    {CONDITION_OPERATORS[c.operator] ||
                                      c.operator}{" "}
                                    {c.value}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Actions list */}
                      <div>
                        <h4 className="text-[12px] font-bold text-[#323338] mb-1">
                          פעולות:
                        </h4>
                        <div className="space-y-1">
                          {w.actions.map((a, i) => (
                            <div
                              key={a.id || i}
                              className="flex items-center gap-2 text-[12px] text-[#676879] bg-[#F5F6F8] px-3 py-1.5 rounded-[4px]"
                            >
                              <span className="font-medium text-[#323338]">
                                {i + 1}.
                              </span>
                              <span>
                                {ACTION_TYPES[a.type]?.label || a.type}
                              </span>
                              {a.config &&
                                typeof a.config === "object" &&
                                (a.config as Record<string, any>).title && (
                                  <span className="text-[#9699A6]">
                                    — {(a.config as Record<string, any>).title}
                                  </span>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </PageCard>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <WorkflowDialog
          initial={editing || undefined}
          onSave={(formData) => {
            if (editing) {
              updateMut.mutate({ id: editing.id, data: formData });
            } else {
              createMut.mutate(formData);
            }
          }}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!automationToDelete}
        onConfirm={() => {
          if (automationToDelete) deleteMut.mutate(automationToDelete);
          setAutomationToDelete(null);
        }}
        onCancel={() => setAutomationToDelete(null)}
        title="מחיקת אוטומציה"
        message="האם אתה בטוח שברצונך למחוק את האוטומציה?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </PageShell>
  );
}
