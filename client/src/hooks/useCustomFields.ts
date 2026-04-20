import { useQuery } from "@tanstack/react-query";
import { listCustomFields, getCustomFieldValues } from "../api/custom-fields";
import type { CustomField, CustomFieldValue } from "../api/custom-fields";

export function useCustomFields(entityType: string) {
  return useQuery<CustomField[]>({
    queryKey: ["custom-fields", entityType],
    queryFn: () => listCustomFields(entityType),
    staleTime: 60_000,
  });
}

export function useCustomFieldValues(entityId: string | undefined) {
  return useQuery<CustomFieldValue[]>({
    queryKey: ["custom-field-values", entityId],
    queryFn: () => getCustomFieldValues(entityId!),
    enabled: !!entityId,
    staleTime: 30_000,
  });
}
