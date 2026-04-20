import { api } from "./client";

export interface SelectOption {
  label: string;
  value: string;
  color?: string;
}

export interface CustomField {
  id: string;
  workspaceId: string;
  entityType: string;
  name: string;
  key: string;
  fieldType: string;
  options: SelectOption[] | null;
  required: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  entityId: string;
  value: string | null;
  field: CustomField;
  createdAt: string;
  updatedAt: string;
}

export function listCustomFields(entityType: string) {
  return api<CustomField[]>(`/custom-fields?entityType=${entityType}`);
}

export function createCustomField(data: {
  entityType: string;
  name: string;
  fieldType: string;
  options?: SelectOption[];
  required?: boolean;
}) {
  return api<CustomField>("/custom-fields", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCustomField(
  id: string,
  data: {
    name?: string;
    fieldType?: string;
    options?: SelectOption[];
    required?: boolean;
    order?: number;
  },
) {
  return api<CustomField>(`/custom-fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCustomField(id: string) {
  return api<{ deleted: boolean }>(`/custom-fields/${id}`, {
    method: "DELETE",
  });
}

export function reorderCustomFields(entityType: string, fieldIds: string[]) {
  return api<{ success: boolean }>("/custom-fields/reorder", {
    method: "PATCH",
    body: JSON.stringify({ entityType, fieldIds }),
  });
}

export function getCustomFieldValues(entityId: string) {
  return api<CustomFieldValue[]>(`/custom-fields/values/${entityId}`);
}

export function updateCustomFieldValues(
  entityId: string,
  values: Array<{ fieldId: string; value: string | null }>,
) {
  return api<CustomFieldValue[]>(`/custom-fields/values/${entityId}`, {
    method: "PATCH",
    body: JSON.stringify({ values }),
  });
}
