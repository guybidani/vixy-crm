import { useEffect, useRef, useCallback } from "react";
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

  // Enter = confirm, Escape = cancel (Escape already handled by Modal)
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    },
    [onConfirm],
  );

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="px-6 py-4" onKeyDown={handleKey}>
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
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "px-4 py-2 text-sm font-medium rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors"
                : "px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
