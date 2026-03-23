import { getAccessToken, getWorkspaceId } from "./client";

const API_BASE = "/api/v1";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getAccessToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  const wsId = getWorkspaceId();
  if (wsId) h["X-Workspace-Id"] = wsId;
  return h;
}

export interface PreviewResult {
  headers: string[];
  preview: string[][];
  totalRows: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function previewImport(file: File): Promise<PreviewResult> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/import/preview`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Preview failed" } }));
    throw err.error || err;
  }

  return res.json();
}

export async function importContacts(
  file: File,
  mapping: Record<string, string>,
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mapping", JSON.stringify(mapping));

  const res = await fetch(`${API_BASE}/import/contacts`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Import failed" } }));
    throw err.error || err;
  }

  return res.json();
}

export async function importDeals(
  file: File,
  mapping: Record<string, string>,
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mapping", JSON.stringify(mapping));

  const res = await fetch(`${API_BASE}/import/deals`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Import failed" } }));
    throw err.error || err;
  }

  return res.json();
}
