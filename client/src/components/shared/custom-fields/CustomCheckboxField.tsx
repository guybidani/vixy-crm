import { useState } from "react";
import { Check, X } from "lucide-react";
import type { CustomField } from "../../../api/custom-fields";

interface Props {
  field: CustomField;
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
}

export default function CustomCheckboxField({
  field: _field,
  value,
  onSave,
  placeholder: _placeholder,
}: Props) {
  const [editing, setEditing] = useState(false);

  function displayIcon() {
    if (!value) return <span className="text-[#C5C7D0]">—</span>;
    return value === "true" ? (
      <Check size={14} className="text-[#00C875]" />
    ) : (
      <X size={14} className="text-[#C5C7D0]" />
    );
  }

  if (editing) {
    const checked = value === "true";
    return (
      <button
        onClick={() => {
          // Toggle & commit immediately — no setTimeout flush hack.
          const next = checked ? "false" : "true";
          onSave(next);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        autoFocus
        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
          checked
            ? "bg-[#0073EA] text-white"
            : "border-2 border-[#C5C7D0] hover:border-[#0073EA]"
        }`}
        aria-label={checked ? "בטל סימון" : "סמן"}
      >
        {checked && <Check size={12} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-[13px] text-right w-full cursor-pointer"
      aria-label="ערוך"
    >
      {displayIcon()}
    </button>
  );
}
