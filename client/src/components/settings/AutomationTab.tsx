import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Play,
  Pause,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  toggleSequence,
  type FollowUpSequence,
} from "../../api/followup";

const CHANNEL_OPTIONS = [
  { value: "EMAIL", label: "אימייל", icon: Mail, color: "#579BFC" },
  {
    value: "WHATSAPP",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
  },
  { value: "SMS", label: "SMS", icon: Smartphone, color: "#FDAB3D" },
  { value: "CALL_TASK", label: "משימת שיחה", icon: Phone, color: "#A25DDC" },
] as const;

const END_ACTIONS = [
  { value: "MOVE_INACTIVE", label: "העבר ללא פעיל" },
  { value: "MOVE_CHURNED", label: "העבר לנוטש" },
  { value: "DO_NOTHING", label: "אל תעשה כלום" },
];

export default function AutomationTab() {
  const { contactStatuses } = useWorkspaceOptions();
  const STATUS_OPTIONS = useMemo(
    () =>
      Object.entries(contactStatuses)
        .filter(([, v]) => !v.hidden)
        .map(([key, v]) => ({ value: key, label: v.label, color: v.color })),
    [contactStatuses],
  );
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FollowUpSequence | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sequences, isLoading } = useQuery({
    queryKey: ["follow-up-sequences"],
    queryFn: getSequences,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-sequences"] });
      toast.success("סדרה נמחקה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleSequence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-sequences"] });
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary">
            סדרות מעקב אוטומטיות
          </h2>
          <p className="text-xs text-text-tertiary">
            הגדר סדרות מעקב אוטומטיות כשליד לא עונה. המערכת תשלח הודעות ותיצור
            משימות בהתאם לשלבים שהגדרת.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          סדרה חדשה
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-card h-24 animate-pulse"
            />
          ))}
        </div>
      ) : !sequences || sequences.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card text-center py-12">
          <Play size={32} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">אין סדרות מעקב</p>
          <p className="text-xs text-text-tertiary mt-1">
            צור סדרה ראשונה כדי להתחיל לעקוב אחרי לידים שלא עונים
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const isExpanded = expandedId === seq.id;
            return (
              <div
                key={seq.id}
                className="bg-white rounded-xl shadow-card overflow-hidden border-r-4 transition-all"
                style={{
                  borderRightColor: seq.isActive ? "#00CA72" : "#C4C4C4",
                }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-text-tertiary" />
                    ) : (
                      <ChevronDown size={16} className="text-text-tertiary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-text-primary">
                        {seq.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${
                          seq.isActive ? "bg-[#00CA72]" : "bg-[#C4C4C4]"
                        }`}
                      >
                        {seq.isActive ? "פעיל" : "מושהה"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                        {seq.steps.length} שלבים
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                        {seq._count.executions} הרצות
                      </span>
                    </div>
                    {seq.description && (
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {seq.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleMut.mutate(seq.id)}
                      className="p-1.5 rounded-md hover:bg-surface-secondary transition-colors"
                      title={seq.isActive ? "השהה" : "הפעל"}
                    >
                      {seq.isActive ? (
                        <Pause size={14} className="text-text-tertiary" />
                      ) : (
                        <Play size={14} className="text-text-tertiary" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(seq);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-surface-secondary transition-colors"
                    >
                      <Pencil size={14} className="text-text-tertiary" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("האם למחוק את הסדרה?")) {
                          deleteMut.mutate(seq.id);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                </div>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border-light">
                    <div className="mt-3 flex gap-4 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <span className="font-semibold">טריגר:</span>
                        {seq.triggerStatuses.map((s) => {
                          const opt = STATUS_OPTIONS.find((o) => o.value === s);
                          return (
                            <span
                              key={s}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{
                                backgroundColor: opt?.color || "#C4C4C4",
                              }}
                            >
                              {opt?.label || s}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-xs text-text-secondary">
                        <span className="font-semibold">סיום:</span>{" "}
                        {END_ACTIONS.find((a) => a.value === seq.endAction)
                          ?.label || seq.endAction}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {seq.steps.map((step, idx) => {
                        const ch = CHANNEL_OPTIONS.find(
                          (c) => c.value === step.channel,
                        );
                        const Icon = ch?.icon || Mail;
                        return (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 p-2.5 bg-surface-secondary rounded-lg"
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: `${ch?.color || "#6161FF"}20`,
                              }}
                            >
                              <Icon
                                size={14}
                                style={{ color: ch?.color || "#6161FF" }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-text-primary">
                                  שלב {step.stepNumber}
                                </span>
                                <span className="text-[10px] text-text-tertiary">
                                  המתן {step.delayDays} ימים
                                </span>
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                                  style={{
                                    backgroundColor: ch?.color || "#6161FF",
                                  }}
                                >
                                  {ch?.label || step.channel}
                                </span>
                              </div>
                              {step.messageTemplate && (
                                <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                                  {step.messageTemplate}
                                </p>
                              )}
                            </div>
                            {idx < seq.steps.length - 1 && (
                              <span className="text-text-tertiary text-xs">
                                &darr;
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <SequenceForm editing={editing} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Sequence Form ───

interface StepForm {
  stepNumber: number;
  delayDays: number;
  channel: string;
  messageTemplate: string;
}

function SequenceForm({
  editing,
  onClose,
}: {
  editing: FollowUpSequence | null;
  onClose: () => void;
}) {
  const { contactStatuses } = useWorkspaceOptions();
  const STATUS_OPTIONS = useMemo(
    () =>
      Object.entries(contactStatuses)
        .filter(([, v]) => !v.hidden)
        .map(([key, v]) => ({ value: key, label: v.label, color: v.color })),
    [contactStatuses],
  );
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: editing?.name || "",
    description: editing?.description || "",
    triggerStatuses: editing?.triggerStatuses || ["LEAD"],
    endAction: editing?.endAction || "MOVE_INACTIVE",
  });

  const [steps, setSteps] = useState<StepForm[]>(
    editing?.steps.map((s) => ({
      stepNumber: s.stepNumber,
      delayDays: s.delayDays,
      channel: s.channel,
      messageTemplate: s.messageTemplate || "",
    })) || [
      {
        stepNumber: 1,
        delayDays: 1,
        channel: "WHATSAPP",
        messageTemplate:
          "היי {{firstName}}, ראיתי שהתעניינת. אשמח לעזור! האם יש זמן לשיחה קצרה?",
      },
    ],
  );

  const createMut = useMutation({
    mutationFn: () =>
      createSequence({
        name: form.name,
        description: form.description || undefined,
        triggerStatuses: form.triggerStatuses,
        endAction: form.endAction,
        steps: steps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          channel: s.channel,
          messageTemplate: s.messageTemplate || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-sequences"] });
      toast.success("סדרה נוצרה!");
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateSequence(editing!.id, {
        name: form.name,
        description: form.description || undefined,
        triggerStatuses: form.triggerStatuses,
        endAction: form.endAction,
        steps: steps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          channel: s.channel,
          messageTemplate: s.messageTemplate || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-up-sequences"] });
      toast.success("סדרה עודכנה!");
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה"),
  });

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        delayDays: 3,
        channel: "EMAIL",
        messageTemplate: "",
      },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, stepNumber: i + 1 })),
    );
  }

  function updateStep(idx: number, field: keyof StepForm, value: any) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  }

  function toggleStatus(val: string) {
    setForm((f) => ({
      ...f,
      triggerStatuses: f.triggerStatuses.includes(val)
        ? f.triggerStatuses.filter((s) => s !== val)
        : [...f.triggerStatuses, val],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-border-light flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-text-primary">
            {editing ? "עריכת סדרת מעקב" : "סדרת מעקב חדשה"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X size={18} className="text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                שם הסדרה *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
                autoFocus
                placeholder="מעקב לידים חדשים"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                תיאור
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="סדרת מעקב ללידים שלא עונים"
              />
            </div>
          </div>

          {/* Trigger Statuses */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              הפעל עבור סטטוסים
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = form.triggerStatuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                      active
                        ? "text-white border-transparent"
                        : "text-text-secondary border-border bg-white hover:border-border"
                    }`}
                    style={
                      active
                        ? { backgroundColor: opt.color, borderColor: opt.color }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* End Action */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              פעולת סיום (כשהסדרה מסתיימת ללא מענה)
            </label>
            <select
              value={form.endAction}
              onChange={(e) =>
                setForm((f) => ({ ...f, endAction: e.target.value }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {END_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              שלבי המעקב
            </label>
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const ch = CHANNEL_OPTIONS.find(
                  (c) => c.value === step.channel,
                );
                return (
                  <div
                    key={idx}
                    className="border border-border rounded-xl p-3 bg-surface-secondary/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical size={14} className="text-text-tertiary" />
                      <span
                        className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: ch?.color || "#6161FF" }}
                      >
                        שלב {step.stepNumber}
                      </span>
                      <div className="flex-1" />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <X size={14} className="text-danger" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-text-tertiary mb-0.5">
                          המתן (ימים)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={step.delayDays}
                          onChange={(e) =>
                            updateStep(
                              idx,
                              "delayDays",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-full px-2.5 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-text-tertiary mb-0.5">
                          ערוץ
                        </label>
                        <select
                          value={step.channel}
                          onChange={(e) =>
                            updateStep(idx, "channel", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        >
                          {CHANNEL_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {step.channel !== "CALL_TASK" && (
                      <div className="mt-2">
                        <label className="block text-[10px] text-text-tertiary mb-0.5">
                          תבנית הודעה (אופציונלי)
                        </label>
                        <textarea
                          value={step.messageTemplate}
                          onChange={(e) =>
                            updateStep(idx, "messageTemplate", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                          rows={2}
                          placeholder="היי {{firstName}}, רציתי לבדוק אם עדיין מעוניין/ת..."
                        />
                        <p className="text-[9px] text-text-tertiary mt-0.5">
                          משתנים: {"{{firstName}}"}, {"{{lastName}}"},{" "}
                          {"{{fullName}}"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light rounded-lg transition-colors"
            >
              <Plus size={14} />
              הוסף שלב
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={
                createMut.isPending ||
                updateMut.isPending ||
                !form.name.trim() ||
                form.triggerStatuses.length === 0 ||
                steps.length === 0
              }
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all hover:shadow-md text-sm disabled:opacity-50"
            >
              {editing ? "עדכן סדרה" : "צור סדרה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
