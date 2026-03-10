import { api, getAccessToken, getWorkspaceId } from "./client";

export interface DocumentLink {
  id: string;
  documentId: string;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
  company?: { id: string; name: string } | null;
  ticket?: { id: string; subject: string } | null;
  createdAt: string;
}

export interface Document {
  id: string;
  type: "FILE" | "RICH_TEXT";
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: { id: string; user: { name: string } };
  links: DocumentLink[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  data: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EntityDocumentLink {
  id: string;
  documentId: string;
  document: Document;
  createdAt: string;
}

export function getDocuments(params?: {
  type?: "FILE" | "RICH_TEXT";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api<DocumentListResponse>(`/documents${qs ? `?${qs}` : ""}`);
}

export function getDocument(id: string) {
  return api<Document>(`/documents/${id}`);
}

export async function uploadDocument(file: File, title?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const wsId = getWorkspaceId();
  if (wsId) headers["X-Workspace-Id"] = wsId;

  const res = await fetch("/api/v1/documents/upload", {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Upload failed" },
    }));
    throw error.error || error;
  }

  return res.json() as Promise<Document>;
}

export function createRichText(data: { title: string; content: string }) {
  return api<Document>("/documents/rich-text", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDocument(
  id: string,
  data: { title?: string; content?: string },
) {
  return api<Document>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteDocument(id: string) {
  return api<{ deleted: boolean }>(`/documents/${id}`, { method: "DELETE" });
}

export function linkDocument(
  id: string,
  entityType: "contact" | "deal" | "company" | "ticket",
  entityId: string,
) {
  return api<DocumentLink>(`/documents/${id}/link`, {
    method: "POST",
    body: JSON.stringify({ entityType, entityId }),
  });
}

export function unlinkDocument(id: string, linkId: string) {
  return api<{ deleted: boolean }>(`/documents/${id}/link/${linkId}`, {
    method: "DELETE",
  });
}

export function getEntityDocuments(
  entityType: "contact" | "deal" | "company" | "ticket",
  entityId: string,
) {
  return api<EntityDocumentLink[]>(
    `/documents/entity/${entityType}/${entityId}`,
  );
}
