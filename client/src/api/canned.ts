import { api } from "./client";

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  category: string | null;
  memberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listCannedResponses(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return api<CannedResponse[]>(`/canned-responses${qs}`);
}

export function createCannedResponse(data: {
  title: string;
  body: string;
  category?: string;
}) {
  return api<CannedResponse>("/canned-responses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCannedResponse(
  id: string,
  data: Partial<{ title: string; body: string; category: string }>,
) {
  return api<CannedResponse>(`/canned-responses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCannedResponse(id: string) {
  return api(`/canned-responses/${id}`, { method: "DELETE" });
}
