import { api } from "./client";

// ─── Snooze Options ───

export interface SnoozeOption {
  label: string;
  minutes: number;
  special?: string;
}

export interface SnoozeOptionsResponse {
  snoozeOptions: SnoozeOption[];
}

export function getSnoozeOptions() {
  return api<SnoozeOptionsResponse>("/settings/snooze-options");
}

export function updateSnoozeOptions(snoozeOptions: SnoozeOption[]) {
  return api<SnoozeOptionsResponse>("/settings/snooze-options", {
    method: "PATCH",
    body: JSON.stringify({ snoozeOptions }),
  });
}

// ─── Workspace Options ───

export interface WorkspaceBranding {
  logoUrl: string | null;
  brandColor: string | null;
}

export interface WorkspaceOptionsResponse {
  customOptions: Record<string, any>;
  defaults: Record<string, any>;
  snoozeOptions?: SnoozeOption[];
  moduleLabels?: Record<string, string>;
  branding?: WorkspaceBranding;
}

export function getWorkspaceOptions() {
  return api<WorkspaceOptionsResponse>("/settings/options");
}

export function updateWorkspaceOptions(customOptions: Record<string, any>) {
  return api<Record<string, any>>("/settings/options", {
    method: "PUT",
    body: JSON.stringify(customOptions),
  });
}

// ─── Branding ───

export function updateBranding(data: {
  logoUrl?: string | null;
  brandColor?: string | null;
}) {
  return api<WorkspaceBranding>("/settings/branding", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Upload workspace logo as multipart/form-data. Returns the updated branding
 * (with the newly-assigned logoUrl pointing at /branding/<uuid>.<ext>).
 */
export async function uploadBrandingLogo(file: File): Promise<WorkspaceBranding> {
  const formData = new FormData();
  formData.append("logo", file);

  // Mirror the fetch options of api() but without the JSON content-type header
  // (browser sets multipart boundary automatically).
  const accessToken = localStorage.getItem("vixy_at");
  const workspaceId = localStorage.getItem("workspaceId");
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

  const res = await fetch("/api/v1/settings/branding/logo", {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Upload failed" },
    }));
    throw err.error || err;
  }
  return res.json();
}

// ─── Module Labels ───

export type ModuleLabels = Record<string, string>;

export function getModuleLabels() {
  return api<{ moduleLabels: ModuleLabels }>("/settings/module-labels");
}

export function updateModuleLabels(moduleLabels: ModuleLabels) {
  return api<{ moduleLabels: ModuleLabels }>("/settings/module-labels", {
    method: "PATCH",
    body: JSON.stringify({ moduleLabels }),
  });
}

// ─── Onboarding / Industry Templates ───

export interface IndustryTemplate {
  name: string;
  icon: string;
  description: string;
  moduleLabels: Record<string, string>;
  dealStages: string[];
  contactStatuses: string[];
}

export interface SetupStatus {
  setupCompleted: boolean;
  industryTemplate: string | null;
  moduleLabels: Record<string, string> | null;
}

export function getSetupStatus() {
  return api<SetupStatus>("/settings/setup-status");
}

export function getIndustryTemplates() {
  return api<{ templates: Record<string, IndustryTemplate> }>("/settings/templates");
}

export function applyTemplate(templateId: string) {
  return api<Record<string, any>>("/settings/apply-template", {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}

export function skipOnboarding() {
  return api<Record<string, any>>("/settings/skip-onboarding", {
    method: "POST",
  });
}

/**
 * Kick off async generation of industry-specific demo data. Server returns
 * 202 Accepted immediately; actual rows appear in the workspace shortly
 * after (typically <1s for the bulk insert transaction).
 */
export function populateDemoData(templateId: string) {
  return api<{ accepted: boolean; templateId: string }>(
    "/settings/populate-demo-data",
    {
      method: "POST",
      body: JSON.stringify({ templateId }),
    },
  );
}

// ─── Nav Permissions ───

export type NavPermissions = Record<string, string[]>;

export function getNavPermissions() {
  return api<{ navPermissions: NavPermissions }>("/settings/nav-permissions");
}

export function updateNavPermissions(navPermissions: NavPermissions) {
  return api<{ navPermissions: NavPermissions }>("/settings/nav-permissions", {
    method: "PUT",
    body: JSON.stringify({ navPermissions }),
  });
}
