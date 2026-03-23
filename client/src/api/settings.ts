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
