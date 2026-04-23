import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../shared/Modal";
import { createWorkspace } from "../../api/auth";
import { handleMutationError } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({
  open,
  onClose,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const { refreshUser, selectWorkspace } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: (workspaceName: string) => createWorkspace(workspaceName),
    onSuccess: async (ws) => {
      toast.success("סביבת עבודה נוצרה!");
      // Refresh user data to get the updated workspaces list
      await refreshUser();
      // Switch to the new workspace
      selectWorkspace(ws.id);
      // Invalidate all queries — new workspace context
      queryClient.invalidateQueries();
      onClose();
      // After a tick, navigate to onboarding so they can set it up
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 300);
    },
    onError: (err) => handleMutationError(err, "שגיאה ביצירת סביבת עבודה"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error("שם סביבת עבודה חייב להכיל לפחות 2 תווים");
      return;
    }
    createMut.mutate(trimmed);
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth="narrow">
      <div className="p-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#CCE5FF] flex items-center justify-center flex-shrink-0">
            <Briefcase size={20} className="text-[#0073EA]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#323338]">
              צור סביבת עבודה חדשה
            </h2>
            <p className="text-[13px] text-[#676879] mt-0.5">
              סביבת עבודה חדשה נפרדת לחלוטין — עם אנשי קשר, עסקאות ולוחות משלה
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="workspace-name"
              className="block form-label mb-1.5"
            >
              שם סביבת העבודה
              <span className="form-required">*</span>
            </label>
            <input
              ref={inputRef}
              id="workspace-name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: החברה שלי"
              maxLength={80}
              dir="rtl"
              disabled={createMut.isPending}
              required
            />
            <p className="help-text mt-1.5">
              ניתן לשנות בכל עת מהגדרות
            </p>
          </div>

          {/* Info box */}
          <div className="bg-[#F6F7FB] border border-[#E6E9EF] rounded-[6px] p-3">
            <p className="text-[12px] text-[#676879] leading-relaxed">
              <strong className="text-[#323338]">מה כולל?</strong>{" "}
              תקבל גישה לכל המודולים (אנשי קשר, עסקאות, משימות, קריאות ועוד).
              לאחר היצירה תועבר ישירות לאשף הגדרה שיעזור לך להתאים את הCRM לעסק שלך.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMut.isPending}
              className="modal-btn-secondary"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || name.trim().length < 2}
              className="modal-btn-primary flex items-center gap-1.5"
            >
              {createMut.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  צור סביבת עבודה
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
