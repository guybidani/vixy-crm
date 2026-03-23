import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { Task, CallResult } from "../../api/tasks";

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

interface Props {
  task: Task;
  onConfirm: (callResult: CallResult | undefined, outcomeNote?: string) => void;
  onClose: () => void;
}

export default function TaskOutcomeModal({ task, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<CallResult | undefined>(undefined);
  const [note, setNote] = useState("");

  const isMeeting = task.taskType === "MEETING";
  const options = isMeeting ? MEETING_RESULTS : CALL_RESULTS;
  const showResults = task.taskType === "CALL" || isMeeting;

  const handleConfirm = () => {
    onConfirm(selected, note || undefined);
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

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
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
        <div className="mb-5">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הערות (אופציונלי)..."
            rows={2}
            dir="rtl"
            className="w-full text-sm border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 py-2 text-sm font-semibold text-text-secondary bg-surface-secondary hover:bg-border rounded-xl transition-colors"
          >
            דלג
          </button>
          <button
            onClick={handleConfirm}
            className="flex-2 px-6 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
          >
            שמור ✓
          </button>
        </div>
      </div>
    </div>
  );
}
