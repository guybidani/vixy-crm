import { api } from "./client";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role?: string;
  memberId?: string;
}

export interface LoginResponse {
  user: User;
  workspaces: WorkspaceInfo[];
  accessToken: string;
}

export interface RegisterResponse {
  user: User;
  workspace: WorkspaceInfo;
  accessToken: string;
}

export interface MeResponse extends User {
  workspaces: WorkspaceInfo[];
}

export function register(data: {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
}) {
  return api<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(email: string, password: string) {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export interface GoogleLoginResponse extends LoginResponse {
  isNewUser: boolean;
}

export function googleLogin(idToken: string) {
  return api<GoogleLoginResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function logout() {
  return api("/auth/logout", { method: "POST" }).catch(() => {});
}

export function getMe() {
  return api<MeResponse>("/auth/me");
}

export function createWorkspace(name: string) {
  return api<WorkspaceInfo>("/auth/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getWorkspaceMembers(workspaceId: string) {
  return api<
    Array<{
      memberId: string;
      userId: string;
      email: string;
      name: string;
      role: string;
    }>
  >(`/auth/workspaces/${workspaceId}/members`);
}

export function inviteMember(
  workspaceId: string,
  email: string,
  role: "ADMIN" | "AGENT",
) {
  return api(`/auth/workspaces/${workspaceId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}
