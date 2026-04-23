import { useAuth } from "./useAuth";

/**
 * Returns the current user's role in the active workspace.
 * Possible values: "OWNER" | "ADMIN" | "AGENT" | undefined
 */
export function useWorkspaceRole(): string | undefined {
  const { workspaces, currentWorkspaceId } = useAuth();
  return workspaces.find((w) => w.id === currentWorkspaceId)?.role;
}

/**
 * Convenience: true if the user can manage the workspace (bulk delete / update / etc).
 * OWNER and ADMIN can manage; AGENT cannot.
 */
export function useCanManageWorkspace(): boolean {
  const role = useWorkspaceRole();
  return role === "OWNER" || role === "ADMIN";
}
