import {
  useState,
  useCallback,
  useEffect,
  Component,
  Suspense,
  lazy,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useTaskReminders } from "./hooks/useTaskReminders";
import { connectSocket, disconnectSocket } from "./lib/socket";
import { cn } from "./lib/utils";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import QuickAdd from "./components/shared/QuickAdd";
import QuickAddModal from "./components/shared/QuickAddModal";
import GlobalSearch from "./components/shared/GlobalSearch";
import CommandPalette from "./components/shared/CommandPalette";
import ShortcutsHelp from "./components/shared/ShortcutsHelp";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import PageSkeleton from "./components/shared/PageSkeleton";

// Lazy-loaded page components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const ContactDetailPage = lazy(() => import("./pages/ContactDetailPage"));
const CompaniesPage = lazy(() => import("./pages/CompaniesPage"));
const CompanyDetailPage = lazy(() => import("./pages/CompanyDetailPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const TicketsPage = lazy(() => import("./pages/TicketsPage"));
const TicketDetailPage = lazy(() => import("./pages/TicketDetailPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const KnowledgeBasePage = lazy(() => import("./pages/KnowledgeBasePage"));
const BoardPage = lazy(() => import("./pages/BoardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function SuspenseFallback() {
  return <PageSkeleton />;
}

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[50vh] gap-4"
          dir="rtl"
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary">משהו השתבש</h2>
          <p className="text-sm text-text-secondary">
            אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm"
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function WithErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <RouteErrorBoundary key={location.pathname}>{children}</RouteErrorBoundary>;
}

function withErrorBoundary(element: ReactNode) {
  return <WithErrorBoundary>{element}</WithErrorBoundary>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-primary text-xl font-bold">V</span>
          </div>
          <p className="text-text-secondary text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-primary text-xl font-bold">V</span>
          </div>
          <p className="text-text-secondary text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"task" | "contact" | "deal" | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  // "+" button in header → QuickAddModal (tab-based)
  const openQuickAdd = useCallback(() => {
    setQuickAddModalOpen(true);
  }, []);
  const openQuickAddWithType = useCallback((type?: "task" | "contact" | "deal") => {
    setQuickAddType(type ?? null);
    setQuickAddOpen(true);
  }, []);
  // Ctrl+K → GlobalSearch
  const openGlobalSearch = useCallback(() => {
    setGlobalSearchOpen(true);
  }, []);
  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);
  const { currentWorkspaceId } = useAuth();

  const { showShortcutsHelp, closeShortcutsHelp } = useKeyboardShortcuts({
    onQuickAdd: openQuickAddWithType,
  });

  // Connect socket.io and join workspace room
  useEffect(() => {
    if (!currentWorkspaceId) return;
    connectSocket(currentWorkspaceId);
    return () => {
      disconnectSocket();
    };
  }, [currentWorkspaceId]);

  // Request browser notification permission on first load
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Listen for task-reminder socket events
  useTaskReminders();

  return (
    <div className="min-h-screen bg-surface-secondary" dir="rtl">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onQuickAdd={openQuickAdd}
        onCommandPalette={openGlobalSearch}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main
        className={cn(
          "pt-14 transition-all duration-200 min-h-screen",
          // Mobile: no margin. Desktop: sidebar margin
          sidebarCollapsed ? "md:mr-14" : "md:mr-[220px]",
        )}
      >
        <div className="p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
      <QuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        initialType={quickAddType}
      />
      <QuickAddModal
        open={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
      />
      <GlobalSearch
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onQuickAdd={openQuickAddWithType}
      />
      <ShortcutsHelp open={showShortcutsHelp} onClose={closeShortcutsHelp} />
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-surface-secondary flex items-center justify-center"
          dir="rtl"
        >
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              משהו השתבש
            </h1>
            <p className="text-sm text-text-secondary mb-4">
              אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm"
            >
              חזור לדף הבית
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={withErrorBoundary(<HomeRoute />)} />
          <Route path="/landing" element={withErrorBoundary(<LandingPage />)} />
          <Route
            path="/login"
            element={
              withErrorBoundary(
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              )
            }
          />
          <Route
            path="/register"
            element={
              withErrorBoundary(
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              )
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={withErrorBoundary(<DashboardPage />)} />
            <Route path="contacts" element={withErrorBoundary(<ContactsPage />)} />
            <Route path="contacts/:id" element={withErrorBoundary(<ContactDetailPage />)} />
            <Route path="companies" element={withErrorBoundary(<CompaniesPage />)} />
            <Route path="companies/:id" element={withErrorBoundary(<CompanyDetailPage />)} />
            <Route path="deals" element={withErrorBoundary(<DealsPage />)} />
            <Route path="leads" element={withErrorBoundary(<LeadsPage />)} />
            <Route path="tasks" element={withErrorBoundary(<TasksPage />)} />
            <Route path="history" element={withErrorBoundary(<HistoryPage />)} />
            <Route path="analytics" element={withErrorBoundary(<AnalyticsPage />)} />
            <Route path="reports" element={withErrorBoundary(<ReportsPage />)} />
            <Route path="tickets" element={withErrorBoundary(<TicketsPage />)} />
            <Route path="tickets/:id" element={withErrorBoundary(<TicketDetailPage />)} />
            <Route path="documents" element={withErrorBoundary(<DocumentsPage />)} />
            <Route path="knowledge" element={withErrorBoundary(<KnowledgeBasePage />)} />
            <Route path="boards/:id" element={withErrorBoundary(<BoardPage />)} />
            <Route path="templates" element={withErrorBoundary(<TemplatesPage />)} />
            <Route path="automations" element={withErrorBoundary(<AutomationsPage />)} />
            <Route path="import" element={withErrorBoundary(<ImportPage />)} />
            <Route path="settings" element={withErrorBoundary(<SettingsPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
