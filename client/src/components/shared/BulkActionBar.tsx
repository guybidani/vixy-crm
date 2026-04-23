import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  X,
  Trash2,
  Tag,
  ArrowRightLeft,
  Copy,
  Download,
  Archive,
  MoreHorizontal,
  ChevronUp,
} from "lucide-react";

export interface BulkActionOption {
  label: string;
  value: string;
  color?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  /** "Move to" / "שנה ל..." — opens a submenu with statusOptions */
  onMoveTo?: (value: string) => void;
  moveToOptions?: BulkActionOption[];
  moveToLabel?: string; // defaults to "העבר ל..."
  onAddTag?: () => void;
  onChangeStatus?: () => void;
  deleting?: boolean;
  /** Arbitrary extra actions — rendered before the delete button */
  children?: ReactNode;
  /** Shown to the left of delete (e.g. summary, selection insights) */
  leftContent?: ReactNode;
}

/** Monday.com-style bulk action button: icon above label, stacked. */
function BulkBtn({
  icon,
  label,
  onClick,
  danger,
  disabled,
  hasSubmenu,
  ariaLabel,
  innerRef,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hasSubmenu?: boolean;
  ariaLabel?: string;
  innerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={innerRef}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      className={`group relative flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-[6px] transition-colors min-w-[64px] ${
        danger
          ? "text-[#FF8A9C] hover:bg-[#E2445C]/20"
          : "text-white hover:bg-white/10"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className={`flex items-center justify-center w-6 h-6 ${danger ? "" : "text-white/90 group-hover:text-white"}`}>
        {icon}
      </span>
      <span className="text-[11px] font-medium flex items-center gap-0.5">
        {label}
        {hasSubmenu && <ChevronUp size={10} className="opacity-60" />}
      </span>
    </button>
  );
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onDuplicate,
  onExport,
  onArchive,
  onMoveTo,
  moveToOptions,
  moveToLabel = "העבר ל...",
  onAddTag,
  onChangeStatus,
  deleting,
  children,
  leftContent,
}: BulkActionBarProps) {
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const moveBtnRef = useRef<HTMLButtonElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Escape key clears selection (if no modal is open above)
  useEffect(() => {
    if (selectedCount === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const openModal = document.querySelector(
          '[aria-modal="true"], [role="alertdialog"]',
        );
        if (openModal) return;
        e.preventDefault();
        if (moveMenuOpen) {
          setMoveMenuOpen(false);
          return;
        }
        onClear();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, onClear, moveMenuOpen]);

  // Close the Move-to submenu on outside click
  useEffect(() => {
    if (!moveMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        moveMenuRef.current &&
        !moveMenuRef.current.contains(e.target as Node) &&
        moveBtnRef.current &&
        !moveBtnRef.current.contains(e.target as Node)
      ) {
        setMoveMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moveMenuOpen]);

  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="toolbar"
      aria-label={`פעולות על ${selectedCount} פריטים נבחרים`}
      dir="rtl"
    >
      <div
        className="flex items-stretch bg-[#292F4C] text-white rounded-[8px] overflow-hidden"
        style={{
          boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Count pill — Monday style, leftmost (RTL: rightmost visually) */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0073EA]">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#0073EA] text-[12px] font-bold"
            aria-live="polite"
          >
            {selectedCount}
          </span>
          <span className="text-[13px] font-semibold">נבחרו</span>
        </div>

        {/* Action buttons — stacked icon+label like Monday */}
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {onDuplicate && (
            <BulkBtn
              icon={<Copy size={18} />}
              label="שכפל"
              onClick={onDuplicate}
              ariaLabel="שכפל פריטים נבחרים"
            />
          )}

          {onExport && (
            <BulkBtn
              icon={<Download size={18} />}
              label="ייצוא"
              onClick={onExport}
              ariaLabel="ייצא פריטים נבחרים"
            />
          )}

          {onArchive && (
            <BulkBtn
              icon={<Archive size={18} />}
              label="העבר לארכיון"
              onClick={onArchive}
              ariaLabel="העבר פריטים לארכיון"
            />
          )}

          {onMoveTo && moveToOptions && moveToOptions.length > 0 && (
            <div className="relative">
              <BulkBtn
                innerRef={moveBtnRef}
                icon={<ArrowRightLeft size={18} />}
                label={moveToLabel}
                onClick={() => setMoveMenuOpen((o) => !o)}
                hasSubmenu
              />
              {moveMenuOpen && (
                <div
                  ref={moveMenuRef}
                  role="menu"
                  className="absolute bottom-full right-0 mb-2 bg-white rounded-lg border border-[#E6E9EF] p-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    boxShadow:
                      "0 8px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.02)",
                  }}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-[#676879] uppercase tracking-wider border-b border-[#E6E9EF] mb-1">
                    {moveToLabel}
                  </div>
                  {moveToOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onMoveTo(opt.value);
                        setMoveMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] text-[14px] text-[#323338] text-right hover:bg-[#F6F7FB] transition-colors"
                      role="menuitem"
                    >
                      {opt.color && (
                        <span
                          className="flex-shrink-0 w-3 h-3 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {onChangeStatus && (
            <BulkBtn
              icon={<ArrowRightLeft size={18} />}
              label="שנה סטטוס"
              onClick={onChangeStatus}
              ariaLabel="שנה סטטוס לפריטים נבחרים"
            />
          )}

          {onAddTag && (
            <BulkBtn
              icon={<Tag size={18} />}
              label="תגית"
              onClick={onAddTag}
              ariaLabel="הוסף תגית לפריטים נבחרים"
            />
          )}

          {children}

          {onDelete && (
            <BulkBtn
              icon={<Trash2 size={18} />}
              label="מחק"
              onClick={onDelete}
              disabled={deleting}
              danger
              ariaLabel="מחק פריטים נבחרים"
            />
          )}
        </div>

        {leftContent && (
          <div className="flex items-center px-3 border-r border-white/10">
            {leftContent}
          </div>
        )}

        {/* Dismiss — rightmost (RTL: leftmost visually) */}
        <div className="flex items-center px-2 border-r border-white/10">
          <button
            onClick={onClear}
            className="p-2 hover:bg-white/10 rounded-[4px] transition-colors"
            aria-label="בטל בחירה (Esc)"
            title="בטל בחירה (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export MoreHorizontal for parent pages needing a spill-over menu
export { MoreHorizontal };
