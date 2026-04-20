import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { useCustomFields, useCustomFieldValues } from "../../hooks/useCustomFields";
import { updateCustomFieldValues } from "../../api/custom-fields";
import type { CustomField, SelectOption } from "../../api/custom-fields";

interface Props {
  entityType: "contact" | "deal" | "company";
  entityId: string;
}

export default function CustomFieldsEditor({ entityType, entityId }: Props) {
  const queryClient = useQueryClient();
  const { data: fields = [] } = useCustomFields(entityType);
  const { data: values = [] } = useCustomFieldValues(entityId);

  // Build a map of fieldId → value
  const valueMap: Record<string, string> = {};
  values.forEach((v) => {
    if (v.value !== null) valueMap[v.fieldId] = v.value;
  });

  const saveMut = useMutation({
    mutationFn: (data: { fieldId: string; value: string | null }) =>
      updateCustomFieldValues(entityId, [data]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-values", entityId] });
    },
    onError: () => toast.error("שגיאה בשמירת שדה"),
  });

  if (fields.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold text-[#676879] uppercase tracking-wide mb-2">
        שדות מותאמים
      </h4>
      <div className="space-y-1">
        {fields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            value={valueMap[field.id] ?? ""}
            onSave={(val) => saveMut.mutate({ fieldId: field.id, value: val || null })}
          />
        ))}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onSave,
}: {
  field: CustomField;
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function save() {
    if (editValue !== value) onSave(editValue);
    setEditing(false);
  }

  function cancel() {
    setEditValue(value);
    setEditing(false);
  }

  function displayValue() {
    if (!value) return <span className="text-[#C5C7D0]">—</span>;
    if (field.fieldType === "checkbox") {
      return value === "true" ? (
        <Check size={14} className="text-[#00CA72]" />
      ) : (
        <X size={14} className="text-[#C5C7D0]" />
      );
    }
    if (field.fieldType === "select" && field.options) {
      const opt = (field.options as SelectOption[]).find((o) => o.value === value);
      if (opt) {
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: opt.color || "#579BFC" }}
          >
            {opt.label}
          </span>
        );
      }
    }
    return <span className="text-[#323338]">{value}</span>;
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors group min-h-[34px]">
      <span className="text-[12px] font-medium text-[#676879] w-[120px] flex-shrink-0 truncate">
        {field.name}
        {field.required && <span className="text-[#E44258] mr-0.5">*</span>}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <FieldInput
            field={field}
            value={editValue}
            onChange={setEditValue}
            onSave={save}
            onCancel={cancel}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[13px] text-right w-full cursor-pointer"
          >
            {displayValue()}
          </button>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  field: CustomField;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const baseClass =
    "w-full px-2 py-1 text-[13px] border border-[#0073EA] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSave();
    if (e.key === "Escape") onCancel();
  }

  switch (field.fieldType) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return (
        <input
          type={field.fieldType === "email" ? "email" : field.fieldType === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className={baseClass}
          placeholder={field.fieldType === "email" ? "example@mail.com" : field.fieldType === "phone" ? "050-000-0000" : ""}
          dir={field.fieldType === "email" || field.fieldType === "url" ? "ltr" : undefined}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className={baseClass}
          dir="ltr"
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Auto-save on date pick
            setTimeout(onSave, 50);
          }}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className={baseClass}
          dir="ltr"
        />
      );

    case "checkbox":
      return (
        <button
          onClick={() => {
            const newVal = value === "true" ? "false" : "true";
            onChange(newVal);
            // Auto-save on toggle
            setTimeout(() => onSave(), 50);
          }}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            value === "true"
              ? "bg-[#0073EA] text-white"
              : "border-2 border-[#C5C7D0] hover:border-[#0073EA]"
          }`}
        >
          {value === "true" && <Check size={12} />}
        </button>
      );

    case "select": {
      const options = (field.options as SelectOption[]) || [];
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setTimeout(onSave, 50);
            }}
            onBlur={onSave}
            autoFocus
            className={`${baseClass} appearance-none pl-7`}
          >
            <option value="">בחר...</option>
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

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className={baseClass}
        />
      );
  }
}
