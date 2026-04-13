import { useState, useRef, useEffect, useCallback } from "react";
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const queryClient = useQueryClient();

  // Sync DOM focus with focusedIndex
  useEffect(() => {
    if (open) {
      menuItemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, open]);

  // Auto-focus first item when menu opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
      requestAnimationFrame(() => {
        menuItemRefs.current[0]?.focus();
      });
    } else {
      menuItemRefs.current = [];
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const snoozeLabel = useRef("");

  const snoozeMut = useMutation({
    mutationFn: (until: string) =>
      updateTask(taskId, { snoozedUntil: until }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-today-widget"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setOpen(false);
      toast.success(`המשימה נדחתה - ${snoozeLabel.current}`);
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
    snoozeLabel.current = option.label;
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
          aria-haspopup="menu"
          aria-expanded={open}
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
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <AlarmClockOff size={12} className="text-[#676879]" />
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-[#E6E9EF] py-1 min-w-[160px]"
          role="menu"
          aria-label="אפשרויות דחייה"
          onKeyDown={(e) => {
            switch (e.key) {
              case "Escape":
                e.preventDefault();
                setOpen(false);
                break;
              case "ArrowDown":
                e.preventDefault();
                setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
                break;
              case "ArrowUp":
                e.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
                break;
              case "Home":
                e.preventDefault();
                setFocusedIndex(0);
                break;
              case "End":
                e.preventDefault();
                setFocusedIndex(options.length - 1);
                break;
              case "Tab":
                e.preventDefault();
                setOpen(false);
                break;
            }
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#9699A6] uppercase border-b border-[#E6E9EF]">
            דחה משימה
          </div>
          {options.map((opt, i) => (
            <button
              key={opt.label}
              ref={(el) => { menuItemRefs.current[i] = el; }}
              role="menuitem"
              tabIndex={focusedIndex === i ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                handleSnooze(opt);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={`w-full text-right px-3 py-1.5 text-xs hover:bg-[#F5F6F8] transition-colors flex items-center gap-2 focus:outline-none focus-visible:bg-[#F5F6F8] ${
                focusedIndex === i ? "bg-[#F5F6F8]" : ""
              }`}
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
