const API_BASE = "/api/v1";

let accessToken: string | null = localStorage.getItem("vixy_at");

export function setTokens(access: string) {
  accessToken = access;
  localStorage.setItem("vixy_at", access);
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem("vixy_at");
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Whether we have a potential session (refresh cookie may exist).
 * We can't read the httpOnly cookie directly, so we track this flag
 * in localStorage (survives page reloads, new tabs, and direct URL navigation).
 */
export function hasSession(): boolean {
  return localStorage.getItem("vixy_session") === "1";
}

export function markSession() {
  localStorage.setItem("vixy_session", "1");
}

export function clearSession() {
  localStorage.removeItem("vixy_session");
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
    "Content-Type": "application/json; charset=utf-8",
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

  // Auto-refresh on 401 (skip login/refresh/register to avoid loops)
  const skipRefreshPaths = ["/auth/login", "/auth/register", "/auth/refresh"];
  if (res.status === 401 && !skipRefreshPaths.includes(path)) {
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
