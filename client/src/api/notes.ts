import { api } from "./client";

export interface Note {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  isPinned: boolean;
  authorId: string;
  author: {
    id: string;
    user: { name: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotesResponse {
  data: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function listNotes(params: {
  entityType: string;
  entityId: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("entityType", params.entityType);
  searchParams.set("entityId", params.entityId);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return api<NotesResponse>(`/notes?${searchParams.toString()}`);
}

export function createNote(data: {
  entityType: string;
  entityId: string;
  content: string;
}) {
  return api<Note>("/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNote(
  id: string,
  data: { content?: string; isPinned?: boolean },
) {
  return api<Note>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteNote(id: string) {
  return api<{ deleted: boolean }>(`/notes/${id}`, {
    method: "DELETE",
  });
}
