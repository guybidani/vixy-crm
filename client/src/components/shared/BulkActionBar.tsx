import { X, Trash2, Tag, ArrowRight } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onChangeStatus?: () => void;
  onAddTag?: () => void;
  deleting?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onChangeStatus,
  onAddTag,
  deleting,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#323338] text-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4">
      <span className="text-sm font-semibold">{selectedCount} נבחרו</span>

      <div className="w-px h-5 bg-white/20" />

      {onAddTag && (
        <button
          onClick={onAddTag}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors"
        >
          <Tag size={14} />
          הוסף תגית
        </button>
      )}

      {onChangeStatus && (
        <button
          onClick={onChangeStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowRight size={14} />
          שנה סטטוס
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-red-500/20 text-red-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          מחק
        </button>
      )}

      <div className="w-px h-5 bg-white/20" />

      <button
        onClick={onClear}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="בטל בחירה"
      >
        <X size={16} />
      </button>
    </div>
  );
}
