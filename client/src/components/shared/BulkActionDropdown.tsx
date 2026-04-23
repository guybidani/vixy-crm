import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface BulkActionDropdownOption {
  key: string;
  label: string;
  /** Small color swatch shown to the left of the label (optional) */
  color?: string;
  /** Avatar/initials bubble shown to the left of the label (optional) */
  avatar?: ReactNode;
}

interface BulkActionDropdownProps {
  icon?: ReactNode;
  label: string;
  options: BulkActionDropdownOption[];
  onSelect: (key: string) => void;
  disabled?: boolean;
  /** Show a search input when options > 6. Useful for assignee lists. */
  searchable?: boolean;
}

/**
 * Inline dropdown sized for BulkActionBar (dark toolbar). Mirrors the
 * ad-hoc dropdown the TasksPage already ships, but reusable across Contacts,
 * Deals, Tasks etc.
 */
export default function BulkActionDropdown({
  icon,
  label,
  options,
  onSelect,
  disabled,
  searchable,
}: BulkActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const showSearch = searchable && options.length > 6;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-white/10 rounded-[4px] transition-colors disabled:opacity-50"
      >
        {icon ?? <ChevronDown size={14} />}
        {label}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full mb-2 right-0 bg-[#404046] rounded-[4px] shadow-lg border border-white/10 py-1 min-w-[180px] max-h-[320px] overflow-y-auto z-50"
        >
          {showSearch && (
            <div className="px-2 pb-1.5 pt-0.5 sticky top-0 bg-[#404046]">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש..."
                className="w-full bg-white/10 text-white placeholder:text-white/50 text-xs rounded-[4px] px-2 py-1 outline-none focus:bg-white/20"
              />
            </div>
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-white/60">אין תוצאות</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                onSelect(opt.key);
                setOpen(false);
              }}
              className="w-full text-right px-3 py-1.5 text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
              role="option"
            >
              {opt.avatar}
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
