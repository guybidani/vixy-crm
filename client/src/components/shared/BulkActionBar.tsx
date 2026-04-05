import { type ReactNode, useEffect } from "react";
import { X, Trash2, Tag, ArrowRight } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onChangeStatus?: () => void;
  onAddTag?: () => void;
  deleting?: boolean;
  children?: ReactNode;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onChangeStatus,
  onAddTag,
  deleting,
  children,
}: BulkActionBarProps) {
  // Escape key clears the selection
  useEffect(() => {
    if (selectedCount === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClear();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, onClear]);

  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#323338] text-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4"
      role="toolbar"
      aria-label={`פעולות על ${selectedCount} פריטים נבחרים`}
    >
      <span className="text-sm font-semibold" aria-live="polite">{selectedCount} נבחרו</span>

      <div className="w-px h-5 bg-white/20" aria-hidden="true" />

      {onAddTag && (
        <button
          onClick={onAddTag}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-white/10 rounded-[4px] transition-colors"
          aria-label="הוסף תגית לפריטים נבחרים"
        >
          <Tag size={14} />
          הוסף תגית
        </button>
      )}

      {onChangeStatus && (
        <button
          onClick={onChangeStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-white/10 rounded-[4px] transition-colors"
          aria-label="שנה סטטוס לפריטים נבחרים"
        >
          <ArrowRight size={14} />
          שנה סטטוס
        </button>
      )}

      {children}

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-busy={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-red-500/20 text-red-300 rounded-[4px] transition-colors disabled:opacity-50"
          aria-label="מחק פריטים נבחרים"
        >
          <Trash2 size={14} />
          מחק
        </button>
      )}

      <div className="w-px h-5 bg-white/20" />

      <button
        onClick={onClear}
        className="p-1.5 hover:bg-white/10 rounded-[4px] transition-colors"
        aria-label="בטל בחירה"
      >
        <X size={16} />
      </button>
    </div>
  );
}
