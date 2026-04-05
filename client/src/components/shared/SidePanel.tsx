import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: "md" | "lg" | "xl";
  children: React.ReactNode;
}

export default function SidePanel({
  open,
  onClose,
  title,
  width = "lg",
  children,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus-trap + Escape handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close if user is editing an input/textarea/contenteditable
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            (active as HTMLElement).isContentEditable)
        ) {
          // Let the input handle Escape first (e.g. cancel edit).
          // Only close the panel if Escape is pressed again when not editing.
          return;
        }
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  // Scroll lock + keyboard + focus management
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    // Auto-focus the close button or first focusable element
    requestAnimationFrame(() => {
      if (panelRef.current) {
        const first =
          panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) {
          first.focus();
        } else {
          panelRef.current.focus();
        }
      }
    });

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const widthClass = {
    md: "max-w-full md:max-w-[50vw]",
    lg: "max-w-full md:max-w-[65vw]",
    xl: "max-w-full md:max-w-[80vw]",
  }[width];

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={title || "פאנל צדדי"}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - slides from left in RTL */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-white shadow-modal overflow-y-auto animate-in slide-in-from-left duration-200 outline-none",
          widthClass,
        )}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 z-10 bg-white border-b border-[#E6E9EF] px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#323338]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#676879] hover:text-[#323338]"
              aria-label="סגור"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {!title && (
          <div className="sticky top-0 z-10 bg-white px-6 py-3 flex items-center justify-end">
            <button
              onClick={onClose}
              className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#9699A6] hover:text-[#323338]"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
