import { getAccessToken, getWorkspaceId } from "./client";

const API_BASE = "/api/v1";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const token = getAccessToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  const wsId = getWorkspaceId();
  if (wsId) h["X-Workspace-Id"] = wsId;
  return h;
}

export type EntityType = "contact" | "deal" | "company";
export type DuplicateStrategy = "skip" | "update" | "create";

export interface PreviewResult {
  headers: string[];
  preview: string[][];
  totalRows: number;
}

export interface ImportFailure {
  row: number;
  error: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: ImportFailure[];
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
    const err = await res
      .json()
      .catch(() => ({ error: { message: "Preview failed" } }));
    throw err.error || err;
  }

  return res.json();
}

/**
 * Unified import that posts parsed rows as JSON. Preferred path for the wizard
 * so we don't re-upload the file for each retry.
 */
export async function executeImport(args: {
  entityType: EntityType;
  columnMapping: Record<string, string>;
  data: Array<Record<string, string>>;
  headers: string[];
  duplicateStrategy: DuplicateStrategy;
}): Promise<ImportResult> {
  const res = await fetch(`${API_BASE}/import/execute`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: { message: "Import failed" } }));
    throw err.error || err;
  }

  return res.json();
}

// Legacy per-entity endpoints (kept for backwards compat)
async function fileImport(
  path: string,
  file: File,
  mapping: Record<string, string>,
  duplicateStrategy: DuplicateStrategy = "skip",
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mapping", JSON.stringify(mapping));
  fd.append("duplicateStrategy", duplicateStrategy);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: { message: "Import failed" } }));
    throw err.error || err;
  }

  return res.json();
}

export function importContacts(
  file: File,
  mapping: Record<string, string>,
  duplicateStrategy: DuplicateStrategy = "skip",
) {
  return fileImport("/import/contacts", file, mapping, duplicateStrategy);
}

export function importCompanies(
  file: File,
  mapping: Record<string, string>,
  duplicateStrategy: DuplicateStrategy = "skip",
) {
  return fileImport("/import/companies", file, mapping, duplicateStrategy);
}

export function importDeals(
  file: File,
  mapping: Record<string, string>,
  duplicateStrategy: DuplicateStrategy = "skip",
) {
  return fileImport("/import/deals", file, mapping, duplicateStrategy);
}
