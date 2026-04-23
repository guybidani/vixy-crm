import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
}

const VARIANT_META = {
  default: {
    icon: Info,
    iconBg: "#E0ECFE",
    iconColor: "#0073EA",
    confirmClass: "modal-btn-primary",
  },
  danger: {
    icon: AlertCircle,
    iconBg: "#FDE0E7",
    iconColor: "#E2445C",
    confirmClass: "modal-btn-danger",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "#FEF0D8",
    iconColor: "#FDAB3D",
    confirmClass: "modal-btn-warning",
  },
} as const;

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "אישור",
  cancelText = "ביטול",
  variant = "default",
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Auto-focus cancel button on open (safer default)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (confirmed) return; // prevent double-click
    setConfirmed(true);
    onConfirm();
  }, [confirmed, onConfirm]);

  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="narrow">
      <div className="px-6 py-6">
        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: meta.iconBg, color: meta.iconColor }}
            aria-hidden
          >
            <Icon size={20} />
          </div>
          <p className="text-[14px] text-[#323338] leading-relaxed flex-1 pt-1.5">
            {message}
          </p>
        </div>

        {/* Footer: RTL — cancel first visually (on the right), primary last (on the left).
            In DOM order we keep cancel-first so Tab order is correct.
            `flex-row-reverse` on the RTL layout places the primary at the end. */}
        <div className="flex items-center justify-start gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="modal-btn-secondary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed}
            className={meta.confirmClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
