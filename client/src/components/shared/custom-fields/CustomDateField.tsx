import { useEffect, useRef, useState } from "react";
import type { CustomField } from "../../../api/custom-fields";

interface Props {
  field: CustomField;
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
}

const BASE_INPUT_CLASS =
  "w-full px-2 py-1 text-[13px] border border-[#0073EA] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20";

export default function CustomDateField({ field: _field, value, onSave, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function commit(nextVal: string) {
    setEditing(false);
    if (nextVal !== value) onSave(nextVal);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => {
          // Auto-save on date pick — pass new value directly (no flush timing hack)
          const next = e.target.value;
          setDraft(next);
          commit(next);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") cancel();
        }}
        className={BASE_INPUT_CLASS}
        placeholder={placeholder}
        dir="ltr"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-[13px] text-right w-full cursor-pointer"
    >
      {value ? (
        <span className="text-[#323338]">{value}</span>
      ) : (
        <span className="text-[#C5C7D0]">—</span>
      )}
    </button>
  );
}
