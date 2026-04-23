import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCustomFields, useCustomFieldValues } from "../../hooks/useCustomFields";
import { updateCustomFieldValues } from "../../api/custom-fields";
import type { CustomField } from "../../api/custom-fields";
import CustomTextField from "./custom-fields/CustomTextField";
import CustomNumberField from "./custom-fields/CustomNumberField";
import CustomDateField from "./custom-fields/CustomDateField";
import CustomSelectField from "./custom-fields/CustomSelectField";
import CustomCheckboxField from "./custom-fields/CustomCheckboxField";

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
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-[4px] hover:bg-[#F6F7FB] transition-colors group min-h-[34px]">
      <span className="text-[12px] font-medium text-[#676879] w-[120px] flex-shrink-0 truncate">
        {field.name}
        {field.required && <span className="text-[#E44258] mr-0.5">*</span>}
      </span>
      <div className="flex-1 min-w-0">
        <FieldInput field={field} value={value} onSave={onSave} />
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onSave,
}: {
  field: CustomField;
  value: string;
  onSave: (val: string) => void;
}) {
  switch (field.fieldType) {
    case "text":
    case "email":
    case "phone":
    case "url":
      return <CustomTextField field={field} value={value} onSave={onSave} />;
    case "number":
      return <CustomNumberField field={field} value={value} onSave={onSave} />;
    case "date":
      return <CustomDateField field={field} value={value} onSave={onSave} />;
    case "select":
      return <CustomSelectField field={field} value={value} onSave={onSave} />;
    case "checkbox":
      return <CustomCheckboxField field={field} value={value} onSave={onSave} />;
    default:
      return <CustomTextField field={field} value={value} onSave={onSave} />;
  }
}
