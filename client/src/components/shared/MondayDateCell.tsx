import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import CalendarPopover from "./CalendarPopover";

interface MondayDateCellProps {
  value: string | null;
  onChange: (val: string | null) => void;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function isOverdue(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
}

export default function MondayDateCell({
  value,
  onChange,
}: MondayDateCellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center gap-1 text-[13px] transition-colors w-full group ${
          value && isOverdue(value)
            ? "text-[#FB275D] font-medium"
            : "text-[#323338] hover:text-[#0073EA]"
        }`}
      >
        {value ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              className="hover:text-[#0073EA] transition-colors"
              aria-label={`תאריך: ${formatDate(value)}. לחץ לשינוי`}
            >
              {formatDate(value)}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-[#C3C6D4] hover:text-[#FB275D] focus:text-[#FB275D] transition-all"
              aria-label="נקה תאריך"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="text-[#C3C6D4] hover:text-[#0073EA] transition-colors"
            aria-label="בחר תאריך"
          >
            —
          </button>
        )}
      </div>

      {open && (
        <CalendarPopover
          value={value}
          onChange={onChange}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
