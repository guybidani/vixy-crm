import { api } from "./client";

export interface WorkspaceOptionsResponse {
  customOptions: Record<string, any>;
  defaults: Record<string, any>;
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
