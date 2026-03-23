import { useState, useEffect } from "react";
import { CheckCircle2, X, CalendarPlus, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import type { Task, CallResult, TaskType } from "../../api/tasks";
import { createTask } from "../../api/tasks";

const CALL_RESULTS: { value: CallResult; label: string; emoji: string }[] = [
  { value: "ANSWERED", label: "ענה", emoji: "✅" },
  { value: "VOICEMAIL", label: "תא קולי", emoji: "📨" },
  { value: "NO_ANSWER", label: "לא ענה", emoji: "📵" },
  { value: "BUSY", label: "תפוס", emoji: "🔄" },
  { value: "RESCHEDULED", label: "נדחה", emoji: "📅" },
  { value: "NOT_RELEVANT", label: "לא רלוונטי", emoji: "❌" },
];

const MEETING_RESULTS: { value: CallResult; label: string; emoji: string }[] = [
  { value: "ANSWERED", label: "התקיימה", emoji: "✅" },
  { value: "RESCHEDULED", label: "נדחתה", emoji: "📅" },
  { value: "NO_ANSWER", label: "לא הגיעו", emoji: "📵" },
  { value: "NOT_RELEVANT", label: "בוטלה", emoji: "❌" },
];

const FOLLOW_UP_TYPES: { value: TaskType; label: string }[] = [
  { value: "CALL", label: "שיחה חוזרת" },
  { value: "MEETING", label: "פגישה" },
  { value: "WHATSAPP", label: "ווטסאפ" },
  { value: "FOLLOW_UP", label: "מעקב כללי" },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultFollowUpTitle(type: TaskType, contactName?: string): string {
  const typeLabel =
    type === "CALL" ? "שיחה חוזרת" :
    type === "MEETING" ? "פגישה" :
    type === "WHATSAPP" ? "ווטסאפ" :
    "מעקב";
  return contactName ? `${typeLabel} - ${contactName}` : typeLabel;
}

interface Props {
  task: Task;
  onConfirm: (callResult: CallResult | undefined, outcomeNote?: string) => void;
  onClose: () => void;
}

export default function TaskOutcomeModal({ task, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<CallResult | undefined>(undefined);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Follow-up state
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => formatDateForInput(addDays(new Date(), 1)));
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpType, setFollowUpType] = useState<TaskType>("CALL");
  const [followUpTitle, setFollowUpTitle] = useState(() =>
    getDefaultFollowUpTitle("CALL", task.contact?.name),
  );
  const [activePreset, setActivePreset] = useState<string | null>("tomorrow");

  // Auto-check follow-up when RESCHEDULED or VOICEMAIL
  useEffect(() => {
    if (selected === "RESCHEDULED" || selected === "VOICEMAIL") {
      setFollowUp(true);
    }
  }, [selected]);

  // Update default title when type changes
  useEffect(() => {
    setFollowUpTitle(getDefaultFollowUpTitle(followUpType, task.contact?.name));
  }, [followUpType, task.contact?.name]);

  const isMeeting = task.taskType === "MEETING";
  const options = isMeeting ? MEETING_RESULTS : CALL_RESULTS;
  const showResults = task.taskType === "CALL" || isMeeting;

  const handlePreset = (preset: string, days: number) => {
    setActivePreset(preset);
    setFollowUpDate(formatDateForInput(addDays(new Date(), days)));
  };

  const handlePresetMonth = () => {
    setActivePreset("month");
    setFollowUpDate(formatDateForInput(addMonths(new Date(), 1)));
  };

  const handleDateChange = (value: string) => {
    setFollowUpDate(value);
    setActivePreset(null);
  };

  const handleConfirm = async () => {
    if (followUp && !followUpDate) {
      toast.error("יש לבחור תאריך למשימת המשך");
      return;
    }

    setSaving(true);
    try {
      // Create follow-up task FIRST (before marking done, to avoid race condition)
      if (followUp) {
        const description = [
          `המשך ל: ${task.title}`,
          note ? note : "",
        ].filter(Boolean).join("\n");

        await createTask({
          title: followUpTitle,
          taskType: followUpType,
          dueDate: followUpDate,
          dueTime: followUpTime || undefined,
          contactId: task.contact?.id,
          dealId: task.deal?.id,
          assigneeId: task.assignee?.id,
          description,
        });

        toast.success("משימת המשך נוצרה");
      }

      // Then: call the parent onConfirm (marks task DONE)
      onConfirm(selected, note || undefined);
    } catch {
      toast.error("שגיאה ביצירת משימת המשך");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onConfirm(undefined, undefined);
  };

  const typeLabel =
    task.taskType === "CALL" ? "שיחה" :
    task.taskType === "MEETING" ? "פגישה" :
    "מעקב";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-secondary transition-colors"
        >
          <X size={14} className="text-text-secondary" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <h3 className="font-bold text-text-primary text-base">
            {typeLabel} הושלמה!
          </h3>
          <p className="text-xs text-text-secondary mt-1 truncate px-4">{task.title}</p>
        </div>

        {/* Result options */}
        {showResults && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-text-secondary mb-2">מה היה התוצאה?</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-xs font-semibold ${
                    selected === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-text-secondary hover:border-border-dark"
                  }`}
                >
                  <span className="text-lg leading-none">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הערות (אופציונלי)..."
            rows={2}
            dir="rtl"
            className="w-full text-sm border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Follow-up scheduling */}
        <div className="mb-5">
          <label className="flex items-center gap-2 cursor-pointer select-none" dir="rtl">
            <input
              type="checkbox"
              checked={followUp}
              onChange={e => setFollowUp(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
            />
            <CalendarPlus size={14} className="text-text-secondary" />
            <span className="text-xs font-semibold text-text-primary">תזמן משימת המשך</span>
          </label>

          {followUp && (
            <div className="mt-3 space-y-3 p-3 bg-surface-secondary/50 rounded-xl border border-border">
              {/* Quick presets */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1.5">מתי?</p>
                <div className="flex gap-1.5 flex-wrap" dir="rtl">
                  {[
                    { key: "tomorrow", label: "מחר", days: 1 },
                    { key: "3days", label: "בעוד 3 ימים", days: 3 },
                    { key: "week", label: "בעוד שבוע", days: 7 },
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => handlePreset(p.key, p.days)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                        activePreset === p.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-text-secondary hover:border-border-dark"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={handlePresetMonth}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      activePreset === "month"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-border-dark"
                    }`}
                  >
                    בעוד חודש
                  </button>
                </div>
              </div>

              {/* Custom date */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1">תאריך</p>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => handleDateChange(e.target.value)}
                  min={formatDateForInput(new Date())}
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors text-text-primary"
                />
              </div>

              {/* Time (optional) */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1">שעה (אופציונלי)</p>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={e => setFollowUpTime(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors text-text-primary"
                />
              </div>

              {/* Follow-up type */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1">סוג משימה</p>
                <div className="relative">
                  <select
                    value={followUpType}
                    onChange={e => setFollowUpType(e.target.value as TaskType)}
                    dir="rtl"
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 pr-3 appearance-none bg-white focus:outline-none focus:border-primary transition-colors text-text-primary"
                  >
                    {FOLLOW_UP_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1">כותרת</p>
                <input
                  type="text"
                  value={followUpTitle}
                  onChange={e => setFollowUpTitle(e.target.value)}
                  dir="rtl"
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors text-text-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="flex-1 py-2 text-sm font-semibold text-text-secondary bg-surface-secondary hover:bg-border rounded-xl transition-colors"
          >
            דלג
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-2 px-6 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
