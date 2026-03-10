import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

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
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    md: "max-w-[50vw]",
    lg: "max-w-[65vw]",
    xl: "max-w-[80vw]",
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
        className={cn(
          "relative w-full bg-white shadow-modal overflow-y-auto animate-in slide-in-from-left duration-200",
          widthClass,
        )}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 z-10 bg-white border-b border-border-light px-6 py-4 flex items-center justify-between">
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

        {!title && (
          <div className="sticky top-0 z-10 bg-white px-6 py-3 flex items-center justify-end">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-text-primary"
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
