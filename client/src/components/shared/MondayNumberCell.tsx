import { useState, useRef, useEffect } from "react";

interface MondayNumberCellProps {
  value: number | null;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}

export default function MondayNumberCell({
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
}: MondayNumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function save() {
    setEditing(false);
    const num = Number(draft);
    if (isNaN(num)) return;
    const clamped =
      min !== undefined && max !== undefined
        ? Math.min(max, Math.max(min, num))
        : min !== undefined
          ? Math.max(min, num)
          : max !== undefined
            ? Math.min(max, num)
            : num;
    if (clamped !== value) {
      onChange(clamped);
    }
  }

  function cancel() {
    setDraft(String(value ?? ""));
    setEditing(false);
  }

  function formatDisplay() {
    if (value === null || value === undefined) return "—";
    const formatted = value.toLocaleString();
    return `${prefix || ""}${formatted}${suffix || ""}`;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        min={min}
        max={max}
        dir="ltr"
        className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b-2 border-[#0073EA] py-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      dir="ltr"
      className="cursor-text text-[13px] text-[#323338] hover:text-[#0073EA] transition-colors"
    >
      {value !== null && value !== undefined ? (
        formatDisplay()
      ) : (
        <span className="text-[#C3C6D4]">—</span>
      )}
    </span>
  );
}
