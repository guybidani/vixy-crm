import { useEffect, useRef, useState } from "react";
import { Undo2, Trash2 } from "lucide-react";

export interface UndoToastProps {
  message: string;
  onUndo: () => void | Promise<void>;
  onDismiss?: () => void;
  /** ms before auto-dismiss. Must match the outer toast's `duration`. */
  duration?: number;
}

/**
 * Gmail-style undo toast. Monday-dark bubble with a 4px red left border,
 * a "בטל" ghost button, and a thin countdown bar at the bottom.
 *
 * This is the toast *body* — render it via `toast.custom((t) => <UndoToast … />)`
 * from react-hot-toast, so the Toaster handles mounting, stacking and removal.
 * The `duration` prop drives the internal countdown bar; pass the same value as
 * the outer `toast.custom(..., { duration })` so the bar and the auto-dismiss
 * line up visually.
 */
export default function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoToastProps) {
  const [remaining, setRemaining] = useState(duration);
  const [undoing, setUndoing] = useState(false);
  const doneRef = useRef(false); // prevents double-fire (Escape + click, etc.)

  // Countdown bar — tick every 60ms to keep the animation smooth without
  // hammering React. Stops on undo so the bar freezes while restoring.
  useEffect(() => {
    if (undoing) return;
    const start = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, duration - (Date.now() - start));
      setRemaining(left);
      if (left <= 0) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [duration, undoing]);

  // Escape dismisses the toast. Only active while mounted, so multiple stacked
  // undo toasts would each register — fine, but we guard with doneRef so a
  // single keypress only closes one toast at a time per instance.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !doneRef.current) {
        doneRef.current = true;
        onDismiss?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  async function handleUndo() {
    if (doneRef.current || undoing) return;
    doneRef.current = true;
    setUndoing(true);
    try {
      await onUndo();
    } finally {
      setUndoing(false);
    }
  }

  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="relative overflow-hidden rounded-[8px] bg-[#292F4C] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] min-w-[280px] max-w-[420px] border-l-[4px] border-l-[#E2445C]"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Trash2
          size={16}
          className="flex-shrink-0 text-[#E2445C]"
          aria-hidden
        />
        <span className="flex-1 text-[13px] font-medium leading-snug">
          {message}
        </span>
        <button
          type="button"
          onClick={handleUndo}
          disabled={undoing}
          className="flex items-center gap-1 rounded-[4px] px-2.5 py-1 text-[13px] font-semibold text-[#66CCFF] hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66CCFF]/60"
        >
          <Undo2 size={14} />
          {undoing ? "משחזר..." : "בטל"}
        </button>
      </div>
      {/* Countdown bar — pure width transition, no keyframes, so it respects
          the actual remaining time even if the tab was backgrounded. */}
      <div className="h-[3px] w-full bg-white/10">
        <div
          className="h-full bg-[#E2445C] transition-[width] duration-[60ms] ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
