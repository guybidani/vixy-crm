import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClockOff, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { updateTask } from "../../api/tasks";

interface SnoozeOption {
  label: string;
  getDate: () => Date;
}

function getSnoozeOptions(): SnoozeOption[] {
  const now = new Date();
  return [
    {
      label: "שעה",
      getDate: () => new Date(now.getTime() + 60 * 60 * 1000),
    },
    {
      label: "שעתיים",
      getDate: () => new Date(now.getTime() + 2 * 60 * 60 * 1000),
    },
    {
      label: "4 שעות",
      getDate: () => new Date(now.getTime() + 4 * 60 * 60 * 1000),
    },
    {
      label: "מחר בבוקר",
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "עוד שבוע בבוקר",
      getDate: () => {
        // Next Sunday at 9:00 AM (Israeli work week starts Sunday)
        const d = new Date(now);
        const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSunday);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];
}

interface SnoozeDropdownProps {
  taskId: string;
  onSnoozed?: () => void;
  /** Render as a full button with text instead of just an icon */
  variant?: "icon" | "button";
}

export default function SnoozeDropdown({
  taskId,
  onSnoozed,
  variant = "icon",
}: SnoozeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const snoozeMut = useMutation({
    mutationFn: (until: string) =>
      updateTask(taskId, { snoozedUntil: until }),
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-today-widget"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setOpen(false);
      onSnoozed?.();
    },
    onError: () => {
      toast.error("שגיאה בדחיית המשימה");
    },
  });

  const handleSnooze = (option: SnoozeOption) => {
    const until = option.getDate().toISOString();
    toast.success(`המשימה נדחתה - ${option.label}`);
    snoozeMut.mutate(until);
  };

  const options = getSnoozeOptions();

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {variant === "button" ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:border-warning hover:text-warning hover:bg-warning/5 transition-all"
          title="דחה משימה"
          aria-label="דחה משימה"
        >
          <AlarmClockOff size={13} />
          דחה משימה
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-surface-tertiary transition-all"
          title="דחה משימה"
          aria-label="דחה משימה"
        >
          <AlarmClockOff size={12} className="text-text-secondary" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-glass border border-border py-1 min-w-[160px]">
          <div className="px-3 py-1.5 text-[10px] font-bold text-text-tertiary uppercase border-b border-border-light">
            דחה משימה
          </div>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                handleSnooze(opt);
              }}
              className="w-full text-right px-3 py-1.5 text-xs hover:bg-surface-secondary transition-colors flex items-center gap-2"
            >
              <Clock
                size={11}
                className="text-text-tertiary flex-shrink-0"
              />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
