import { api } from "./client";

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count: { contacts: number; deals: number };
}

export function listTags() {
  return api<Tag[]>("/tags");
}

export function createTag(data: { name: string; color?: string }) {
  return api<Tag>("/tags", { method: "POST", body: JSON.stringify(data) });
}

export function updateTag(id: string, data: { name?: string; color?: string }) {
  return api<Tag>(`/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTag(id: string) {
  return api(`/tags/${id}`, { method: "DELETE" });
}

export function assignTag(
  tagId: string,
  entityType: "contact" | "deal",
  entityId: string,
) {
  return api("/tags/assign", {
    method: "POST",
    body: JSON.stringify({ tagId, entityType, entityId }),
  });
}

export function unassignTag(
  tagId: string,
  entityType: "contact" | "deal",
  entityId: string,
) {
  return api("/tags/unassign", {
    method: "POST",
    body: JSON.stringify({ tagId, entityType, entityId }),
  });
}
