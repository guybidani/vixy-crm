import {
  useState,
  useCallback,
  useEffect,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useTaskReminders } from "./hooks/useTaskReminders";
import { connectSocket, disconnectSocket } from "./lib/socket";
import { cn } from "./lib/utils";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import QuickAdd from "./components/shared/QuickAdd";
import ShortcutsHelp from "./components/shared/ShortcutsHelp";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyDetailPage from "./pages/CompanyDetailPage";
import DealsPage from "./pages/DealsPage";
import LeadsPage from "./pages/LeadsPage";
import TasksPage from "./pages/TasksPage";
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import DocumentsPage from "./pages/DocumentsPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import BoardPage from "./pages/BoardPage";
import SettingsPage from "./pages/SettingsPage";
import AutomationsPage from "./pages/AutomationsPage";
import LandingPage from "./pages/LandingPage";

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
  const [quickAddType, setQuickAddType] = useState<"task" | "contact" | "deal" | null>(null);
  const openQuickAdd = useCallback(() => {
    setQuickAddType(null);
    setQuickAddOpen(true);
  }, []);
  const openQuickAddWithType = useCallback((type?: "task" | "contact" | "deal") => {
    setQuickAddType(type ?? null);
    setQuickAddOpen(true);
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
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main
        className={cn(
          "pt-14 transition-all duration-200 min-h-screen",
          // Mobile: no margin. Desktop: sidebar margin
          sidebarCollapsed ? "md:mr-16" : "md:mr-60",
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
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="boards/:id" element={<BoardPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
