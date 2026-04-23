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
  /**
   * Max-width class.
   * Preset shortcuts: "narrow" (480px), "wide" (640px).
   * You can also pass a raw tailwind class like `max-w-xl` or `max-w-[720px]`.
   * Default: "narrow" (480px) — matches Monday.com's common modal width.
   */
  maxWidth?: "narrow" | "wide" | string;
  /** Ref to the element that should receive focus initially */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Hide the default close (X) button */
  hideCloseButton?: boolean;
}

function resolveMaxWidth(maxWidth: string): string {
  if (maxWidth === "narrow") return "max-w-[480px]";
  if (maxWidth === "wide") return "max-w-[640px]";
  return maxWidth;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
  maxWidth = "narrow",
  initialFocusRef,
  hideCloseButton = false,
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

  const maxWidthClass = resolveMaxWidth(maxWidth);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      {/* Backdrop click target */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Content */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative bg-white rounded-[8px] w-full outline-none animate-modal-spring",
          maxWidthClass,
          className,
        )}
        style={{ boxShadow: "0 16px 48px rgba(0, 0, 0, 0.18)" }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E9EF]">
            <h2 className="text-[20px] font-semibold text-[#323338] leading-tight">
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-[4px] hover:bg-[#F6F7FB] transition-colors text-[#676879] hover:text-[#323338]"
                aria-label="סגור"
                type="button"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
