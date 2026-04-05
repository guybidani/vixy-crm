import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClockOff, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { updateTask } from "../../api/tasks";
import {
  useSnoozeOptions,
  resolveSnoozeDate,
  DEFAULT_SNOOZE_OPTIONS,
} from "../../hooks/useSnoozeOptions";

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
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  const { snoozeOptions, isLoading: snoozeLoading } = useSnoozeOptions();
  const options = snoozeLoading ? DEFAULT_SNOOZE_OPTIONS : snoozeOptions;

  const handleSnooze = (option: (typeof options)[number]) => {
    const until = resolveSnoozeDate(option).toISOString();
    toast.success(`המשימה נדחתה - ${option.label}`);
    snoozeMut.mutate(until);
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {variant === "button" ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border border-[#E6E9EF] text-[#676879] hover:border-warning hover:text-warning hover:bg-warning/5 transition-all"
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
          className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#F5F6F8] transition-all"
          title="דחה משימה"
          aria-label="דחה משימה"
        >
          <AlarmClockOff size={12} className="text-[#676879]" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-[#E6E9EF] py-1 min-w-[160px]">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#9699A6] uppercase border-b border-[#E6E9EF]">
            דחה משימה
          </div>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                handleSnooze(opt);
              }}
              className="w-full text-right px-3 py-1.5 text-xs hover:bg-[#F5F6F8] transition-colors flex items-center gap-2"
            >
              <Clock
                size={11}
                className="text-[#9699A6] flex-shrink-0"
              />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
