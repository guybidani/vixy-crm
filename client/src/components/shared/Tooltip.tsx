import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  /** Tooltip content — short hebrew string or React node. */
  content: ReactNode;
  /** The triggering element (must accept `onMouseEnter`/`onFocus`). Wrap it in a single child. */
  children: ReactNode;
  /** Preferred side. Default `top`. */
  side?: TooltipSide;
  /** Show delay in ms. Default 350. */
  delay?: number;
  /** If true, skip rendering (useful when disabling). */
  disabled?: boolean;
  /** Extra class for the bubble. */
  className?: string;
}

/**
 * Lightweight Monday-style tooltip.
 *
 * Replaces `title=""` attributes with a consistent UI treatment:
 *   <Tooltip content="רשום שיחה"><button>…</button></Tooltip>
 *
 * - Delayed open (350ms default) to avoid flicker.
 * - Hides instantly on mouse leave / blur / Escape.
 * - Re-uses the trigger's existing styling; no wrapper layout change.
 * - Falls back to CSS-only animation, so no popper dependency.
 */
export default function Tooltip({
  content,
  children,
  side = "top",
  delay = 350,
  disabled = false,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  function show() {
    if (disabled || !content) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  }

  function hide() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const sideClasses: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && content && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[100] px-2 py-1 rounded-[4px] bg-[#323338] text-white text-[11px] font-medium whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-100",
            sideClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
