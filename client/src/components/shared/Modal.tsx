import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Max width class (default: max-w-lg) */
  maxWidth?: string;
  /** Ref to the element that should receive focus initially */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
  maxWidth = "max-w-lg",
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus trap handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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

  // Scroll lock + keyboard handling + focus management
  useEffect(() => {
    if (!open) return;

    // Store the element that triggered the modal so we can restore focus
    triggerRef.current = document.activeElement as HTMLElement | null;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);

    // Auto-focus: prefer initialFocusRef, then first focusable, then the dialog itself
    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const first =
          dialogRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) {
          first.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    });

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element
      triggerRef.current?.focus();
    };
  }, [open, handleKeyDown, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Content */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative bg-white rounded-xl shadow-modal w-full outline-none animate-in fade-in zoom-in-95 duration-200",
          maxWidth,
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-text-primary"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
