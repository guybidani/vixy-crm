import { useState, useRef, useEffect } from "react";

interface MondayTextCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}

export default function MondayTextCell({
  value,
  onChange,
  placeholder = "—",
  dir,
}: MondayTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function save() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
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
        dir={dir}
        className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b-2 border-[#0073EA] py-0 px-0"
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
      dir={dir}
      className="w-full cursor-text truncate text-[13px] text-[#323338] hover:text-[#0073EA] transition-colors"
      title={value || undefined}
    >
      {value || (
        <span className="text-[#C3C6D4] hover:text-[#0073EA]/60 transition-colors text-[12px] italic">
          {placeholder}
        </span>
      )}
    </span>
  );
}
