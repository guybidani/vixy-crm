import { useState, useEffect } from "react";
import { Filter, ArrowUpDown, Layers } from "lucide-react";
import Modal from "./Modal";

export interface SaveViewPreview {
  /** Flat filters object (e.g. { status: "HOT" }) */
  filters?: Record<string, unknown>;
  /** Board column filters (e.g. [{ column: "status", values: ["HOT"] }]) */
  boardFilters?: Array<{ column: string; values: string[] }>;
  /** Sort column + direction */
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  /** Group-by column key */
  groupByKey?: string | null;
  /** Optional label map (col key → Hebrew label) for prettier preview */
  columnLabels?: Record<string, string>;
}

interface SaveViewDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => void;
  saving?: boolean;
  /** When provided, dialog is in rename mode */
  mode?: "create" | "rename";
  /** Prefill name (useful for rename) */
  initialName?: string;
  /** Prefill default checkbox */
  initialIsDefault?: boolean;
  /** Preview of what will be saved — shown only in create mode */
  preview?: SaveViewPreview;
}

export default function SaveViewDialog({
  open,
  onClose,
  onSave,
  saving,
  mode = "create",
  initialName = "",
  initialIsDefault = false,
  preview,
}: SaveViewDialogProps) {
  const [name, setName] = useState(initialName);
  const [isDefault, setIsDefault] = useState(initialIsDefault);

  // Reset form when dialog opens so stale values don't persist
  useEffect(() => {
    if (open) {
      setName(initialName);
      setIsDefault(initialIsDefault);
    }
  }, [open, initialName, initialIsDefault]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), isDefault);
  }

  const title = mode === "rename" ? "שנה שם תצוגה" : "שמור תצוגה";
  const submitLabel = mode === "rename" ? "עדכן" : "שמור";
  const submitting = mode === "rename" ? "מעדכן..." : "שומר...";

  // Build preview chips
  const previewChips = buildPreviewChips(preview);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            שם התצוגה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל: לידים חמים שלי"
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            autoFocus
            required
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]/20"
          />
          <span className="text-sm text-[#676879]">תצוגת ברירת מחדל</span>
        </label>

        {mode === "create" && previewChips.length > 0 && (
          <div className="rounded-[6px] border border-[#E6E9EF] bg-[#F6F7FB] p-3 space-y-2">
            <div className="text-[11px] font-semibold text-[#676879] uppercase tracking-wide">
              יישמרו ההגדרות הבאות
            </div>
            <div className="flex flex-wrap gap-1.5">
              {previewChips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-white border border-[#D0D4E4] text-[12px] text-[#323338] rounded-full px-2 py-0.5"
                >
                  {chip.icon}
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        )}
        {mode === "create" && previewChips.length === 0 && (
          <div className="rounded-[6px] border border-dashed border-[#E6E9EF] bg-[#FAFAFB] p-3 text-[12px] text-[#9699A6]">
            אין מסננים, מיון או קיבוץ פעילים. התצוגה תישמר עם ההגדרות הנוכחיות.
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F6F7FB] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-sm disabled:opacity-50"
          >
            {saving ? submitting : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function buildPreviewChips(preview?: SaveViewPreview) {
  const chips: Array<{ icon: React.ReactNode; text: string }> = [];
  if (!preview) return chips;
  const labels = preview.columnLabels ?? {};
  const labelFor = (k: string) => labels[k] || k;

  // Flat filters
  for (const [key, val] of Object.entries(preview.filters ?? {})) {
    if (val == null || val === "") continue;
    chips.push({
      icon: <Filter size={11} className="text-[#0073EA]" />,
      text: `${labelFor(key)}: ${val}`,
    });
  }

  // Board column filters
  for (const bf of preview.boardFilters ?? []) {
    if (!bf.values || bf.values.length === 0) continue;
    chips.push({
      icon: <Filter size={11} className="text-[#0073EA]" />,
      text: `${labelFor(bf.column)}: ${bf.values.join(", ")}`,
    });
  }

  // Sort
  if (preview.sortBy) {
    const dir = preview.sortDir === "desc" ? "יורד" : "עולה";
    chips.push({
      icon: <ArrowUpDown size={11} className="text-[#9699A6]" />,
      text: `מיון: ${labelFor(preview.sortBy)} (${dir})`,
    });
  }

  // Group by
  if (preview.groupByKey) {
    chips.push({
      icon: <Layers size={11} className="text-[#A25DDC]" />,
      text: `קיבוץ לפי: ${labelFor(preview.groupByKey)}`,
    });
  }

  return chips;
}
