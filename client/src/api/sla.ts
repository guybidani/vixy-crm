import { api } from "./client";

export interface SlaPolicy {
  id: string;
  name: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  isDefault: boolean;
  createdAt: string;
  _count: { tickets: number };
}

export function listSlaPolicies() {
  return api<SlaPolicy[]>("/sla-policies");
}

export function createSlaPolicy(data: {
  name: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly?: boolean;
  isDefault?: boolean;
}) {
  return api<SlaPolicy>("/sla-policies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSlaPolicy(
  id: string,
  data: Partial<{
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
    businessHoursOnly: boolean;
    isDefault: boolean;
  }>,
) {
  return api<SlaPolicy>(`/sla-policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteSlaPolicy(id: string) {
  return api(`/sla-policies/${id}`, { method: "DELETE" });
}
