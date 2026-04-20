import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CustomField, SelectOption } from "../../../api/custom-fields";

interface Props {
  field: CustomField;
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
}

const BASE_INPUT_CLASS =
  "w-full px-2 py-1 text-[13px] border border-[#0073EA] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20";

export default function CustomSelectField({ field, value, onSave, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Server validates that `select` fields always have options, so we can narrow safely here.
  const options: SelectOption[] = field.options ?? [];

  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editing]);

  function commit(nextVal: string) {
    setEditing(false);
    if (nextVal !== value) onSave(nextVal);
  }

  if (editing) {
    return (
      <div className="relative">
        <select
          ref={selectRef}
          value={value}
          onChange={(e) => {
            // Auto-save on selection — pass new value directly (no flush timing hack)
            commit(e.target.value);
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          className={`${BASE_INPUT_CLASS} appearance-none pl-7`}
        >
          <option value="">{placeholder ?? "בחר..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
        />
      </div>
    );
  }

  const selectedOpt = value ? options.find((o) => o.value === value) : undefined;

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-[13px] text-right w-full cursor-pointer"
    >
      {selectedOpt ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
          style={{ backgroundColor: selectedOpt.color || "#579BFC" }}
        >
          {selectedOpt.label}
        </span>
      ) : value ? (
        <span className="text-[#323338]">{value}</span>
      ) : (
        <span className="text-[#C5C7D0]">—</span>
      )}
    </button>
  );
}
