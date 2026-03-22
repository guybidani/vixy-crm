import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createElement } from "react";
import * as authApi from "../api/auth";
import {
  setTokens,
  clearTokens,
  setWorkspaceId,
  getWorkspaceId,
  clearWorkspaceId,
  hasSession,
  markSession,
  clearSession,
} from "../api/client";
import { queryClient } from "../lib/queryClient";

interface AuthState {
  user: authApi.User | null;
  workspaces: authApi.WorkspaceInfo[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    workspaceName: string;
  }) => Promise<void>;
  logout: () => void;
  selectWorkspace: (workspaceId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspaces: [],
    currentWorkspaceId: getWorkspaceId(),
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setState((prev) => ({
        ...prev,
        user: me,
        workspaces: me.workspaces,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch {
      clearTokens();
      clearSession();
      clearWorkspaceId();
      setState({
        user: null,
        workspaces: [],
        currentWorkspaceId: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    if (hasSession()) {
      refreshUser();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setTokens(res.accessToken);
    markSession();

    // Auto-select workspace: use stored, or first available
    const storedWs = getWorkspaceId();
    const wsId =
      storedWs && res.workspaces.some((w) => w.id === storedWs)
        ? storedWs
        : res.workspaces[0]?.id || null;

    if (wsId) setWorkspaceId(wsId);

    setState({
      user: res.user,
      workspaces: res.workspaces,
      currentWorkspaceId: wsId,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      workspaceName: string;
    }) => {
      const res = await authApi.register(data);
      setTokens(res.accessToken);
      markSession();
      setWorkspaceId(res.workspace.id);

      setState({
        user: res.user,
        workspaces: [res.workspace],
        currentWorkspaceId: res.workspace.id,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    authApi.logout(); // Fire-and-forget: clears httpOnly cookie on server
    clearTokens();
    clearSession();
    clearWorkspaceId();
    queryClient.clear(); // Remove all cached queries to prevent stale refetches
    window.location.href = "/login"; // Hard redirect to ensure clean state
  }, []);

  const selectWorkspace = useCallback((wsId: string) => {
    setWorkspaceId(wsId);
    setState((prev) => ({ ...prev, currentWorkspaceId: wsId }));
  }, []);

  return createElement(
    AuthContext.Provider,
    {
      value: {
        ...state,
        login,
        register,
        logout,
        selectWorkspace,
        refreshUser,
      },
    },
    children,
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
