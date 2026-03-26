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
        <p className="text-[13px] text-[#676879] mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-[7px] text-[13px] font-medium rounded-[4px] border border-[#D0D4E4] text-[#676879] hover:bg-[#F5F6F8] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={
              variant === "danger"
                ? "px-4 py-[7px] text-[13px] font-medium rounded-[4px] bg-[#E44258] text-white hover:bg-[#C93048] transition-colors disabled:opacity-50"
                : "px-4 py-[7px] text-[13px] font-medium rounded-[4px] bg-[#FDAB3D] text-white hover:bg-[#E09232] transition-colors disabled:opacity-50"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
