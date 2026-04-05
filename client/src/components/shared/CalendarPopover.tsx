import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarPopoverProps {
  value: string | null; // ISO date string YYYY-MM-DD
  onChange: (val: string | null) => void;
  onClose: () => void;
}

const DAYS_HE = ["ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳", "א׳"];
const MONTHS_HE = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon, 1=Tue, ..., 6=Sun for the first day of the month */
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // convert Sun=0 to Mon-based index
}

function toISODate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(
  str: string | null,
): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const clean = str.split("T")[0];
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

export default function CalendarPopover({
  value,
  onChange,
  onClose,
}: CalendarPopoverProps) {
  const parsed = parseDate(value);
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [viewYear, setViewYear] = useState(parsed?.year ?? todayY);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? todayM);
  const [textInput, setTextInput] = useState(value?.split("T")[0] || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Previous month's trailing days
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );

  const cells: Array<{
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
  }> = [];

  // Fill previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({
      day: prevMonthDays - i,
      month: pm,
      year: py,
      isCurrentMonth: false,
    });
  }

  // Fill current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }

  // Fill next month days to complete 6 rows
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
  }

  function selectDate(y: number, m: number, d: number) {
    const iso = toISODate(y, m, d);
    setTextInput(iso);
    onChange(iso);
    onClose();
  }

  function handleTextSubmit() {
    const p = parseDate(textInput);
    if (p) {
      onChange(toISODate(p.year, p.month, p.day));
      onClose();
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function goToday() {
    const iso = toISODate(todayY, todayM, todayD);
    setTextInput(iso);
    setViewYear(todayY);
    setViewMonth(todayM);
    onChange(iso);
    onClose();
  }

  const selectedParsed = parseDate(value);

  return (
    <div
      ref={containerRef}
      className="absolute top-full mt-1 right-0 z-[60] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] w-[280px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top bar: Today + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6E9EF]">
        <button
          onClick={goToday}
          className="text-[12px] text-[#323338] hover:text-[#0073EA] font-medium px-2 py-1 rounded hover:bg-[#F5F6F8] transition-colors"
        >
          היום
        </button>
      </div>

      {/* Date text input */}
      <div className="px-3 py-2">
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTextSubmit();
          }}
          placeholder="YYYY-MM-DD"
          className="w-full text-[13px] text-[#323338] border border-[#C3C6D4] rounded px-2 py-1.5 outline-none focus:border-[#0073EA] text-center font-mono"
          dir="ltr"
        />
      </div>

      {/* Month/Year navigation */}
      <div className="flex items-center justify-between px-3 py-1">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-medium text-[#323338]">
            {MONTHS_HE[viewMonth]}
          </span>
          <span className="text-[13px] font-medium text-[#323338]">
            {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F5F6F8] text-[#676879] hover:text-[#323338] transition-colors"
            aria-label="חודש קודם"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F5F6F8] text-[#676879] hover:text-[#323338] transition-colors"
            aria-label="חודש הבא"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2">
        {DAYS_HE.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] text-[#676879] py-1 font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2 pb-2" role="grid" aria-label={`${MONTHS_HE[viewMonth]} ${viewYear}`}>
        {cells.map((cell, i) => {
          const isToday =
            cell.day === todayD &&
            cell.month === todayM &&
            cell.year === todayY;
          const isSelected =
            selectedParsed &&
            cell.day === selectedParsed.day &&
            cell.month === selectedParsed.month &&
            cell.year === selectedParsed.year;

          const ariaLabel = `${cell.day} ${MONTHS_HE[cell.month]} ${cell.year}${isToday ? " (היום)" : ""}${isSelected ? " (נבחר)" : ""}`;

          return (
            <button
              key={i}
              onClick={() => selectDate(cell.year, cell.month, cell.day)}
              aria-label={ariaLabel}
              aria-current={isToday ? "date" : undefined}
              aria-selected={isSelected || undefined}
              className={`
                w-8 h-8 flex items-center justify-center rounded-full text-[12px] transition-all
                ${!cell.isCurrentMonth ? "text-[#C3C6D4]" : "text-[#323338]"}
                ${isSelected ? "bg-[#0073EA] text-white font-bold" : ""}
                ${isToday && !isSelected ? "ring-2 ring-[#0073EA] ring-inset font-bold text-[#0073EA]" : ""}
                ${!isSelected && cell.isCurrentMonth ? "hover:bg-[#DCE9F5]" : ""}
                ${!isSelected && !cell.isCurrentMonth ? "hover:bg-[#F5F6F8]" : ""}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
