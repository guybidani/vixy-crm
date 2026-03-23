import { api } from "./client";

export interface SavedView {
  id: string;
  entity: string;
  name: string;
  filters: Record<string, unknown>;
  isDefault: boolean;
  sortBy: string | null;
  sortDir: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listViews(entity: string) {
  return api<SavedView[]>(`/views?entity=${encodeURIComponent(entity)}`);
}

export function createView(data: {
  entity: string;
  name: string;
  filters: Record<string, unknown>;
  isDefault?: boolean;
  sortBy?: string;
  sortDir?: string;
}) {
  return api<SavedView>("/views", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateView(
  id: string,
  data: {
    name?: string;
    filters?: Record<string, unknown>;
    isDefault?: boolean;
    sortBy?: string | null;
    sortDir?: string | null;
  },
) {
  return api<SavedView>(`/views/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteView(id: string) {
  return api(`/views/${id}`, { method: "DELETE" });
}

export function setViewDefault(id: string) {
  return api<SavedView>(`/views/${id}/default`, { method: "POST" });
}
