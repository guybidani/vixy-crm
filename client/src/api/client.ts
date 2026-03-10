const API_BASE = "/api/v1";

let accessToken: string | null = null;

export function setTokens(access: string) {
  accessToken = access;
}

export function clearTokens() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Whether we have a potential session (refresh cookie may exist).
 * We can't read the httpOnly cookie directly, so we track this flag
 * in sessionStorage (survives page reload within tab, clears on tab close).
 */
export function hasSession(): boolean {
  return sessionStorage.getItem("vixy_session") === "1";
}

export function markSession() {
  sessionStorage.setItem("vixy_session", "1");
}

export function clearSession() {
  sessionStorage.removeItem("vixy_session");
}

let workspaceId: string | null = localStorage.getItem("workspaceId");

export function setWorkspaceId(id: string) {
  workspaceId = id;
  localStorage.setItem("workspaceId", id);
}

export function getWorkspaceId() {
  return workspaceId;
}

export function clearWorkspaceId() {
  workspaceId = null;
  localStorage.removeItem("workspaceId");
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Send httpOnly cookie
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (workspaceId) {
    headers["X-Workspace-Id"] = workspaceId;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // Always send cookies
  });

  // Auto-refresh on 401 (skip for auth endpoints to avoid loops)
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      clearTokens();
      clearSession();
      clearWorkspaceId();
      window.location.href = "/login";
      throw { code: "SESSION_EXPIRED", message: "Session expired" };
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: "Something went wrong" },
    }));
    throw error.error || error;
  }

  return res.json();
}
