import { useState, useEffect, useRef, useCallback } from "react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "אישור",
  cancelText = "ביטול",
  variant = "danger",
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Auto-focus cancel button on open
  useEffect(() => {
    if (open) {
      // Small delay so the modal has mounted
      const t = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const [confirmed, setConfirmed] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (confirmed) return; // prevent double-click
    setConfirmed(true);
    onConfirm();
  }, [confirmed, onConfirm]);

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <div className="px-6 py-4">
        <p className="text-sm text-text-secondary mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={
              variant === "danger"
                ? "px-4 py-2 text-sm font-medium rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
                : "px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
