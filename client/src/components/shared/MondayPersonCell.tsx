import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { avatarColor } from "../../lib/utils";

export interface PersonOption {
  id: string;
  name: string;
}

interface MondayPersonCellProps {
  value: { id: string; name: string } | null;
  onChange: (id: string | null) => void;
  options: PersonOption[];
  placeholder?: string;
}

export default function MondayPersonCell({
  value,
  onChange,
  options,
  placeholder = "—",
}: MondayPersonCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" ref={ref}>
      {/* Display */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 text-[13px] text-[#323338] hover:text-[#0073EA] transition-colors w-full truncate"
      >
        {value ? (
          <>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
              style={{ backgroundColor: avatarColor(value.name) }}
            >
              {value.name[0]?.toUpperCase() || "?"}
            </span>
            <span className="truncate">{value.name}</span>
          </>
        ) : (
          <span className="text-[#C3C6D4] hover:text-[#0073EA]/60 transition-colors text-[12px] italic">
            + {placeholder}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] w-[220px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E6E9EF]">
            <Search size={14} className="text-[#C3C6D4] flex-shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>

          {/* Options list */}
          <div className="max-h-[200px] overflow-y-auto">
            {/* Unassign option */}
            {value && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F6F8] transition-colors text-right"
              >
                <X size={14} className="text-[#C3C6D4]" />
                <span className="text-[12px] text-[#676879]">הסר שיוך</span>
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-[#C3C6D4]">
                לא נמצאו תוצאות
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F6F8] transition-colors text-right ${
                    value?.id === option.id ? "bg-[#F0F3FF]" : ""
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                    style={{ backgroundColor: avatarColor(option.name) }}
                  >
                    {option.name[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="text-[13px] text-[#323338] truncate">
                    {option.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
