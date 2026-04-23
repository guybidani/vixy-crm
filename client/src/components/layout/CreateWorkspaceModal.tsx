import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../shared/Modal";
import { createWorkspace } from "../../api/auth";
import { setWorkspaceId } from "../../api/client";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Robustly extract a human-readable message from an unknown error.
 * The `api` client throws plain `{ code, message }` objects (not Error
 * instances), so `err instanceof Error` misses them. Cover every shape.
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: unknown; error?: { message?: unknown } };
    if (typeof e.message === "string" && e.message) return e.message;
    if (e.error && typeof e.error.message === "string" && e.error.message) {
      return e.error.message;
    }
  }
  return fallback;
}

export default function CreateWorkspaceModal({
  open,
  onClose,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      // Focus input after modal opens. Modal.tsx also auto-focuses the first
      // focusable element via requestAnimationFrame, so use a slightly longer
      // timeout to win the race and land focus on the input specifically.
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: (workspaceName: string) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[CreateWorkspaceModal] mutationFn firing", { workspaceName });
      }
      return createWorkspace(workspaceName);
    },
    onSuccess: (ws) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[CreateWorkspaceModal] onSuccess", ws);
      }
      // Switch workspace context before redirect — localStorage is synchronous
      // so the new workspaceId is in place before the browser navigates.
      setWorkspaceId(ws.id);
      toast.success("סביבת עבודה נוצרה!");
      // Hard redirect to /onboarding — this guarantees all state (React
      // Query cache, AuthProvider, etc.) is re-initialised with the new
      // workspace context, avoiding subtle race conditions.
      window.location.href = "/onboarding";
    },
    onError: (err) => {
      // IMPORTANT: our api client throws `{ code, message }` plain objects,
      // NOT Error instances — so the shared `handleMutationError` helper
      // was silently swallowing the real message. Use a shape-aware
      // extractor instead so users see the actual server error.
      // eslint-disable-next-line no-console
      console.error("[CreateWorkspaceModal] createWorkspace failed:", err);
      const message = extractErrorMessage(err, "שגיאה ביצירת סביבת עבודה");
      toast.error(message);
    },
  });

  function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[CreateWorkspaceModal] handleSubmit invoked", {
        name,
        isPending: createMut.isPending,
      });
    }
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("נא להזין שם סביבת עבודה");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length < 2) {
      toast.error("שם סביבת עבודה חייב להכיל לפחות 2 תווים");
      inputRef.current?.focus();
      return;
    }
    if (createMut.isPending) return; // Guard against double-click
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="לדוגמה: החברה שלי"
              maxLength={80}
              dir="rtl"
              disabled={createMut.isPending}
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
              disabled={createMut.isPending}
              className="modal-btn-primary flex items-center gap-1.5"
              style={{ pointerEvents: "auto" }}
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
