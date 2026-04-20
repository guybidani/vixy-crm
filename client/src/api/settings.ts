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

export interface WorkspaceOptionsResponse {
  customOptions: Record<string, any>;
  defaults: Record<string, any>;
  snoozeOptions?: SnoozeOption[];
  moduleLabels?: Record<string, string>;
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
