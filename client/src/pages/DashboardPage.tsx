import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatRelativeTime } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../lib/socket";
import {
  Users,
  Handshake,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  LayoutGrid,
  X,
  RefreshCw,
  Sliders,
  Pencil,
  Check,
  GripVertical,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getDashboard, type DashboardData } from "../api/dashboard";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import CalendarWidget from "../components/dashboard/CalendarWidget";
import TodaysTasksWidget from "../components/dashboard/TodaysTasksWidget";
import TeamLeaderboard from "../components/dashboard/TeamLeaderboard";
import DashboardCustomizeModal from "../components/dashboard/DashboardCustomizeModal";
import {
  WIDGET_REGISTRY,
  DEFAULT_WIDGET_ORDER,
} from "../components/dashboard/widgetRegistry";
import {
  getDashboardLayout,
  updateDashboardLayout,
  type DashboardLayout,
  type DashboardWidgetConfig,
  type DashboardWidgetSize,
} from "../api/settings";

const STAGE_COLORS: Record<string, string> = {
  LEAD: "#C4C4C4",
  QUALIFIED: "#A25DDC",
  PROPOSAL: "#0073EA",
  NEGOTIATION: "#FDAB3D",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  NOTE: <FileText size={14} />,
  CALL: <Phone size={14} />,
  EMAIL: <Mail size={14} />,
  MEETING: <Calendar size={14} />,
  WHATSAPP: <MessageSquare size={14} />,
  STATUS_CHANGE: <TrendingUp size={14} />,
  SYSTEM: <AlertTriangle size={14} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  NOTE: "#0073EA",
  CALL: "#00C875",
  EMAIL: "#579BFC",
  MEETING: "#A25DDC",
  WHATSAPP: "#25D366",
  STATUS_CHANGE: "#FDAB3D",
  SYSTEM: "#C4C4C4",
};

const MOTIVATIONAL = [
  "בוא נסגור עסקאות היום!",
  "כל שיחה היא הזדמנות.",
  "צוות מנצח מתחיל מכאן.",
  "היום הוא יום מצוין לגדול.",
  "ממשיכים קדימה, עושים היסטוריה!",
];

function getTodayMotivational() {
  const day = new Date().getDay();
  return MOTIVATIONAL[day % MOTIVATIONAL.length];
}

function formatTodayDate() {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const WELCOME_DISMISSED_KEY = "vixy_crm_welcome_dismissed";

// Client-side fallback when the server hasn't returned a layout yet.
function buildDefaultLayout(): DashboardLayout {
  return {
    widgets: DEFAULT_WIDGET_ORDER.map((id, idx) => ({
      id,
      visible: id !== "my-tasks",
      order: idx,
      size: WIDGET_REGISTRY[id]?.defaultSize ?? "medium",
    })),
  };
}

function WelcomeBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(WELCOME_DISMISSED_KEY) === "1",
  );

  const dismiss = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  const steps = [
    {
      num: 1,
      icon: <Users size={22} className="text-[#0073EA]" />,
      iconBg: "#CCE5FF",
      title: "הוסף אנשי קשר",
      desc: "ייבא לידים או הוסף ידנית — כל לקוח פוטנציאלי מתחיל כאן.",
      cta: "הוסף איש קשר",
      onClick: () => navigate("/contacts?new=1"),
    },
    {
      num: 2,
      icon: <LayoutGrid size={22} className="text-[#579BFC]" />,
      iconBg: "#E3EFFE",
      title: "צור בורד",
      desc: "נהל פרויקטים, משימות ותהליכים בעזרת לוחות גמישים.",
      cta: "לבורדים",
      onClick: () => navigate("/boards"),
    },
    {
      num: 3,
      icon: <Handshake size={22} className="text-[#00C875]" />,
      iconBg: "#D6F5E8",
      title: "עקוב אחרי עסקאות",
      desc: "הגדר עסקאות וצא למסלול לאורך צינור המכירות שלך.",
      cta: "צור עסקה",
      onClick: () => navigate("/deals?new=1"),
    },
  ];

  return (
    <div className="relative bg-gradient-to-l from-[#0073EA]/10 via-white to-[#00C875]/10 rounded-2xl border border-[#0073EA]/20 shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6 mb-6 overflow-hidden">
      {/* dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 left-3 p-1.5 rounded-[4px] hover:bg-black/5 transition-colors text-[#9699A6] hover:text-[#323338]"
        aria-label="סגור"
      >
        <X size={16} />
      </button>

      {/* header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#323338] mb-1">
          ברוך הבא ל‑Vixy CRM! 🎉 בוא נתחיל
        </h2>
        <p className="text-sm text-[#676879]">
          שלושה צעדים פשוטים להתחלה — בצע אותם לפי הסדר לתוצאה הטובה ביותר.
        </p>
      </div>

      {/* step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div
            key={s.num}
            className="bg-white rounded-xl border border-[#E6E9EF] p-4 flex flex-col gap-3 hover:shadow-md hover:border-[#0073EA]/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.iconBg }}
              >
                {s.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#9699A6] uppercase tracking-wide">
                  שלב {s.num}
                </span>
                <p className="text-sm font-bold text-[#323338] leading-tight">
                  {s.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#676879] leading-relaxed flex-1">
              {s.desc}
            </p>
            <button
              onClick={s.onClick}
              className="w-full py-2 rounded-[4px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold transition-all hover:shadow-sm active:scale-[0.97]"
            >
              {s.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { dealStages, activityTypes } = useWorkspaceOptions();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  // ─── Dashboard layout (per member) ───
  const { data: serverLayout } = useQuery({
    queryKey: ["dashboard-layout"],
    queryFn: getDashboardLayout,
    staleTime: 5 * 60_000,
  });

  const layoutMutation = useMutation({
    mutationFn: updateDashboardLayout,
    onSuccess: (next) => {
      queryClient.setQueryData(["dashboard-layout"], next);
    },
  });

  const layout: DashboardLayout = useMemo(
    () => serverLayout ?? buildDefaultLayout(),
    [serverLayout],
  );

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ─── Real-time: invalidate dashboard on socket events ───
  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  useEffect(() => {
    const socket = getSocket();

    // Events emitted by the server that indicate data changes
    // affecting dashboard KPIs (deals, contacts, tasks, activities)
    const events = [
      "notification",       // generic notification — entity was created/updated
      "notification:new",   // automation-triggered notification
      "task-reminder",      // task due — affects tasks KPI
      "followup:update",    // followup sequence update — affects contacts/activities
      "board:item:updated", // board item changed
    ];

    events.forEach((event) => socket.on(event, invalidateDashboard));

    return () => {
      events.forEach((event) => socket.off(event, invalidateDashboard));
    };
  }, [invalidateDashboard]);

  // ─── Edit-mode helpers ───
  const persistLayout = useCallback(
    async (next: DashboardLayout): Promise<void> => {
      await layoutMutation.mutateAsync(next);
    },
    [layoutMutation],
  );

  const hideWidget = useCallback(
    (id: string) => {
      const next: DashboardLayout = {
        widgets: layout.widgets.map((w) =>
          w.id === id ? { ...w, visible: false } : w,
        ),
      };
      persistLayout(next);
    },
    [layout, persistLayout],
  );

  const resizeWidget = useCallback(
    (id: string, size: DashboardWidgetSize) => {
      const next: DashboardLayout = {
        widgets: layout.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
      };
      persistLayout(next);
    },
    [layout, persistLayout],
  );

  const reorderWidget = useCallback(
    (id: string, direction: "up" | "down") => {
      const visible = [...layout.widgets]
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);
      const idx = visible.findIndex((w) => w.id === id);
      if (idx === -1) return;
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= visible.length) return;

      const swapped = [...visible];
      [swapped[idx], swapped[swapWith]] = [swapped[swapWith], swapped[idx]];

      // Rebuild full widget list preserving hidden ones; re-number orders.
      const visibleOrder = new Map(swapped.map((w, i) => [w.id, i]));
      const next: DashboardLayout = {
        widgets: layout.widgets.map((w) => {
          if (w.visible && visibleOrder.has(w.id)) {
            return { ...w, order: visibleOrder.get(w.id)! };
          }
          return w;
        }),
      };
      // Ensure hidden widgets sit after visible ones so ordering stays tidy.
      next.widgets.sort((a, b) => {
        if (a.visible && !b.visible) return -1;
        if (!a.visible && b.visible) return 1;
        return a.order - b.order;
      });
      next.widgets.forEach((w, i) => (w.order = i));
      persistLayout(next);
    },
    [layout, persistLayout],
  );

  if (isLoading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <div className="h-7 w-48 bg-[#E6E9EF] rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#E6E9EF] rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 bg-[#E6E9EF] rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 border-r-[3px] border-r-[#E6E9EF] animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#E6E9EF]" />
                <div className="h-3 w-16 bg-[#E6E9EF] rounded" />
              </div>
              <div className="h-8 w-16 bg-[#E6E9EF] rounded mb-1.5" />
              <div className="h-3.5 w-28 bg-[#E6E9EF] rounded mb-1" />
              <div className="h-3 w-20 bg-[#E6E9EF] rounded" />
            </div>
          ))}
        </div>

        {/* Pipeline + Activity feed skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-[#E6E9EF] rounded" />
              <div className="h-4 w-16 bg-[#E6E9EF] rounded" />
            </div>
            <div className="h-8 bg-[#E6E9EF] rounded-xl mb-5" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mb-3">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E6E9EF]" />
                  <div className="h-3.5 bg-[#E6E9EF] rounded flex-1" />
                  <div className="h-3 w-14 bg-[#E6E9EF] rounded" />
                </div>
                <div className="h-1.5 bg-[#E6E9EF] rounded-full mr-5" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-[#E6E9EF] rounded" />
              <div className="h-4 w-16 bg-[#E6E9EF] rounded-full" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#E6E9EF] flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-[#E6E9EF] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[#E6E9EF] rounded w-1/2" />
                </div>
                <div className="h-3 w-12 bg-[#E6E9EF] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-[#E44258]" />
        </div>
        <h2 className="text-lg font-bold text-[#323338] mb-1">שגיאה בטעינת הדשבורד</h2>
        <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את הנתונים. נסו שוב.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
        >
          <RefreshCw size={14} />
          נסה שוב
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const isNewUser = kpis.contactsTotal === 0 && kpis.dealsOpenCount === 0;

  // Ordered, visible widgets. Unknown ids are gracefully skipped.
  const orderedWidgets = [...layout.widgets]
    .sort((a, b) => a.order - b.order)
    .filter((w) => WIDGET_REGISTRY[w.id])
    .filter((w) => w.visible);

  return (
    <div>
      {/* ===== WELCOME BANNER (new user) ===== */}
      {isNewUser && <WelcomeBanner />}

      {/* ===== TOP BAR (customize + edit mode) ===== */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-[4px] bg-[#00C875] hover:bg-[#00A75F] text-white text-[12px] font-semibold transition-colors"
          >
            <Check size={14} />
            סיום עריכה
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-[7px] rounded-[4px] bg-white hover:bg-[#F6F7FB] text-[#323338] text-[12px] font-medium transition-colors border border-[#E6E9EF]"
              title="ערוך תצוגה"
            >
              <Pencil size={14} />
              ערוך תצוגה
            </button>
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-[7px] rounded-[4px] bg-white hover:bg-[#F6F7FB] text-[#323338] text-[12px] font-medium transition-colors border border-[#E6E9EF]"
            >
              <Sliders size={14} />
              התאם דשבורד
            </button>
          </>
        )}
      </div>

      {/* ===== WIDGETS ===== */}
      <div className="space-y-6">
        {orderedWidgets.map((cfg, idx) => (
          <WidgetFrame
            key={cfg.id}
            config={cfg}
            editMode={editMode}
            canMoveUp={idx > 0}
            canMoveDown={idx < orderedWidgets.length - 1}
            onHide={() => hideWidget(cfg.id)}
            onResize={(s) => resizeWidget(cfg.id, s)}
            onMove={(dir) => reorderWidget(cfg.id, dir)}
          >
            <WidgetBody
              id={cfg.id}
              size={cfg.size}
              data={data}
              userName={user?.name ?? ""}
              dealStages={dealStages}
              activityTypes={activityTypes}
            />
          </WidgetFrame>
        ))}

        {orderedWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-[#E6E9EF]">
            <LayoutGrid size={28} className="text-[#9699A6] mb-2" />
            <p className="text-sm font-semibold text-[#323338] mb-1">
              אין ווידג׳טים גלויים
            </p>
            <p className="text-[12px] text-[#676879] mb-4">
              הפעל ווידג׳טים בחלון ההתאמה
            </p>
            <button
              onClick={() => setCustomizeOpen(true)}
              className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
            >
              פתח התאמה
            </button>
          </div>
        )}
      </div>

      {/* ===== CUSTOMIZE MODAL ===== */}
      <DashboardCustomizeModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        layout={layout}
        onSave={persistLayout}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// WidgetFrame — wraps every widget. In edit mode shows the drag
// handles, close button and S/M/L picker overlaid on the widget.
// ──────────────────────────────────────────────────────────────
function WidgetFrame({
  config,
  editMode,
  canMoveUp,
  canMoveDown,
  onHide,
  onResize,
  onMove,
  children,
}: {
  config: DashboardWidgetConfig;
  editMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onHide: () => void;
  onResize: (s: DashboardWidgetSize) => void;
  onMove: (dir: "up" | "down") => void;
  children: React.ReactNode;
}) {
  const meta = WIDGET_REGISTRY[config.id];
  if (!editMode) return <>{children}</>;

  return (
    <div className="relative group">
      {/* Edit-mode toolbar */}
      <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 bg-white rounded-[6px] shadow-[0_2px_10px_rgba(0,0,0,0.12)] border border-[#E6E9EF] p-1">
        <button
          onClick={() => onMove("up")}
          disabled={!canMoveUp}
          className="p-1 rounded-[4px] hover:bg-[#F6F7FB] text-[#676879] disabled:opacity-30"
          title="הזז למעלה"
        >
          <GripVertical size={14} />
        </button>
        <span className="text-[11px] font-semibold text-[#323338] px-1.5">
          {meta?.title || config.id}
        </span>
        {meta?.resizable && (
          <div className="flex items-center gap-0.5 border-r border-[#E6E9EF] pr-1 mr-0.5">
            {(["small", "medium", "large"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onResize(s)}
                className={`w-5 h-5 text-[10px] font-bold rounded-[3px] transition-colors ${
                  config.size === s
                    ? "bg-[#0073EA] text-white"
                    : "text-[#9699A6] hover:text-[#323338]"
                }`}
                title={`גודל ${s === "small" ? "S" : s === "medium" ? "M" : "L"}`}
              >
                {s === "small" ? "S" : s === "medium" ? "M" : "L"}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onHide}
          disabled={!meta?.hideable}
          className="p-1 rounded-[4px] hover:bg-[#FFE8E8] text-[#E44258] disabled:opacity-30"
          title="הסתר"
        >
          <X size={14} />
        </button>
        <button
          onClick={() => onMove("down")}
          disabled={!canMoveDown}
          className="p-1 rounded-[4px] hover:bg-[#F6F7FB] text-[#676879] disabled:opacity-30"
          title="הזז למטה"
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Widget body with edit-mode ring */}
      <div className="outline outline-2 outline-offset-2 outline-[#0073EA]/40 rounded-xl">
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// WidgetBody — renders the actual component for a given widget id.
// New widgets? Add them to WIDGET_REGISTRY + a case here.
// ──────────────────────────────────────────────────────────────
function WidgetBody({
  id,
  data,
  userName,
  dealStages,
  activityTypes,
}: {
  id: string;
  size: DashboardWidgetSize;
  data: DashboardData;
  userName: string;
  dealStages: Record<string, { label: string }>;
  activityTypes: Record<string, { label: string }>;
}) {
  const navigate = useNavigate();
  const { kpis, pipeline, recentActivities, rottingDeals, myTasks } = data;

  switch (id) {
    case "greeting":
      return <GreetingHeader userName={userName} />;

    case "stat-cards":
      return (
        <StatCardsRow
          kpis={kpis}
          onNavigate={(path) => navigate(path)}
        />
      );

    case "pipeline-chart":
      return (
        <PipelineFunnelWidget
          pipeline={pipeline}
          totalValue={kpis.totalPipelineValue}
          dealStages={dealStages}
          onNavigate={() => navigate("/deals")}
        />
      );

    case "activity-feed":
      return (
        <ActivityFeedWidget
          activities={recentActivities}
          activityTypes={activityTypes}
        />
      );

    case "team-performance":
      return <TeamLeaderboard />;

    case "deals-at-risk":
      if (!rottingDeals || rottingDeals.length === 0) return null;
      return (
        <DealsAtRiskWidget
          deals={rottingDeals}
          onOpen={(id) => navigate(`/deals?open=${id}`)}
        />
      );

    case "my-tasks":
      return (
        <MyTasksWidget
          tasks={myTasks}
          onNavigate={() => navigate("/tasks")}
        />
      );

    case "calendar":
      return <CalendarWidget />;

    case "todays-tasks":
      return <TodaysTasksWidget />;

    default:
      // Unknown widget id — skip gracefully.
      return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Greeting
// ──────────────────────────────────────────────────────────────
function GreetingHeader({ userName }: { userName: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold text-[#323338] mb-0.5">
          שלום, {userName} 👋
        </h1>
        <p className="text-[13px] text-[#676879]">
          {formatTodayDate()} · {getTodayMotivational()}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <QuickActionButton
          label="ליד חדש"
          color="#0073EA"
          bg="#CCE5FF"
          onClick={() => navigate("/contacts?new=1")}
        />
        <QuickActionButton
          label="עסקה חדשה"
          color="#00C875"
          bg="#D6F5E8"
          onClick={() => navigate("/deals?new=1")}
        />
        <QuickActionButton
          label="משימה"
          color="#FDAB3D"
          bg="#FEF0D8"
          onClick={() => navigate("/tasks?new=1")}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Stat cards row
// ──────────────────────────────────────────────────────────────
function StatCardsRow({
  kpis,
  onNavigate,
}: {
  kpis: DashboardData["kpis"];
  onNavigate: (path: string) => void;
}) {
  const callsThisWeek = kpis.callsThisWeek;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 [&>*:nth-child(1)]:animate-fade-in-up [&>*:nth-child(2)]:animate-fade-in-up [&>*:nth-child(2)]:[animation-delay:50ms] [&>*:nth-child(3)]:animate-fade-in-up [&>*:nth-child(3)]:[animation-delay:100ms] [&>*:nth-child(4)]:animate-fade-in-up [&>*:nth-child(4)]:[animation-delay:150ms]">
      <StatCard
        borderColor="#0073EA"
        icon={<Users size={22} />}
        iconBg="#CCE5FF"
        iconColor="#0073EA"
        label="לידים חדשים השבוע"
        value={kpis.contactsThisWeek}
        subValue={`סה"כ ${kpis.contactsTotal}`}
        trend={kpis.contactsThisWeek > 0 ? "up" : "neutral"}
        trendLabel={
          kpis.contactsThisWeek > 0
            ? `+${kpis.contactsThisWeek} השבוע`
            : "אין לידים חדשים"
        }
        onClick={() => onNavigate("/contacts")}
      />
      <StatCard
        borderColor="#00C875"
        icon={<Handshake size={22} />}
        iconBg="#D6F5E8"
        iconColor="#00C875"
        label="עסקאות פתוחות"
        value={kpis.dealsOpenCount}
        subValue={`₪${kpis.totalPipelineValue.toLocaleString()}`}
        trend="neutral"
        trendLabel={`שווי צינור`}
        onClick={() => onNavigate("/deals")}
      />
      <StatCard
        borderColor={kpis.tasksOverdue > 0 ? "#FF4D4F" : "#A25DDC"}
        icon={<CheckCircle2 size={22} />}
        iconBg={kpis.tasksOverdue > 0 ? "#FFE8E8" : "#EDE1F5"}
        iconColor={kpis.tasksOverdue > 0 ? "#FF4D4F" : "#A25DDC"}
        label="משימות להיום"
        value={kpis.tasksToday}
        subValue={
          kpis.tasksOverdue > 0 ? `${kpis.tasksOverdue} באיחור` : "הכל בזמן"
        }
        trend={kpis.tasksOverdue > 0 ? "down" : "up"}
        trendLabel={
          kpis.tasksOverdue > 0
            ? `${kpis.tasksOverdue} באיחור!`
            : `${kpis.tasksCompletedThisWeek} הושלמו השבוע`
        }
        onClick={() => onNavigate("/tasks")}
      />
      <StatCard
        borderColor="#579BFC"
        icon={<Phone size={22} />}
        iconBg="#E3EFFE"
        iconColor="#579BFC"
        label="שיחות השבוע"
        value={callsThisWeek}
        subValue="שיחות בשבוע האחרון"
        trend={callsThisWeek > 0 ? "up" : "neutral"}
        trendLabel={
          callsThisWeek > 0 ? `${callsThisWeek} שיחות` : "לא נרשמו שיחות"
        }
        onClick={() => onNavigate("/contacts")}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Quick Action Button
// ──────────────────────────────────────────────────────────────
function QuickActionButton({
  label,
  color,
  bg,
  onClick,
}: {
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-3 py-[6px] rounded-[4px] text-[13px] font-medium transition-colors border"
      style={{ backgroundColor: bg, color, borderColor: `${color}30` }}
    >
      <Plus size={14} strokeWidth={2.5} />
      {label}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────────────────────────
function StatCard({
  borderColor,
  icon,
  iconBg,
  iconColor,
  label,
  value,
  subValue,
  trend,
  trendLabel,
  onClick,
}: {
  borderColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  subValue: string;
  trend: "up" | "down" | "neutral";
  trendLabel: string;
  onClick?: () => void;
}) {
  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : Minus;

  const trendColor =
    trend === "up"
      ? "#00C875"
      : trend === "down"
        ? "#FF4D4F"
        : "#9CA3AF";

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow duration-200 border-r-[3px] group text-right w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1"
      style={{ borderRightColor: borderColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div
          className="flex items-center gap-0.5 text-[11px] font-semibold"
          style={{ color: trendColor }}
        >
          <TrendIcon size={12} />
          <span>{trendLabel}</span>
        </div>
      </div>
      <p className="text-[28px] font-bold text-[#323338] leading-tight">
        {value.toLocaleString()}
      </p>
      <p className="text-[13px] text-[#676879] mt-0.5">{label}</p>
      <p className="text-[11px] text-[#9699A6] mt-1">{subValue}</p>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Pipeline Funnel Widget
// ──────────────────────────────────────────────────────────────
function PipelineFunnelWidget({
  pipeline,
  totalValue,
  dealStages,
  onNavigate,
}: {
  pipeline: Array<{ stage: string; count: number; value: number }>;
  totalValue: number;
  dealStages: Record<string, { label: string }>;
  onNavigate: () => void;
}) {
  const maxCount = pipeline.length > 0 ? Math.max(...pipeline.map((p) => p.count)) : 1;

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#323338] text-[15px]">
            צינור מכירות
          </h2>
          <p className="text-[12px] text-[#676879] mt-0.5">
            לפי שלב
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-[#F6F7FB] text-[#676879]">
            ₪{totalValue.toLocaleString()}
          </span>
          <button
            onClick={onNavigate}
            className="text-[12px] font-medium text-[#0073EA] hover:underline transition-colors"
          >
            הצג הכל →
          </button>
        </div>
      </div>

      {pipeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Handshake size={32} className="text-[#9699A6] mb-2" />
          <p className="text-sm text-[#9699A6]">אין עסקאות פתוחות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stacked horizontal bar */}
          <div className="flex rounded-xl overflow-hidden h-8 mb-5 shadow-inner bg-[#F6F7FB] gap-0.5">
            {pipeline.map((p) => {
              const pct =
                totalValue > 0 ? (p.value / totalValue) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={p.stage}
                  className="flex items-center justify-center text-white text-[10px] font-bold transition-all duration-500 hover:brightness-110 first:rounded-r-xl last:rounded-l-xl"
                  style={{
                    backgroundColor: STAGE_COLORS[p.stage] || "#C4C4C4",
                    width: `${Math.max(pct, 6)}%`,
                  }}
                  title={`${dealStages[p.stage]?.label || p.stage}: ₪${p.value.toLocaleString()}`}
                >
                  {pct > 12 && `₪${(p.value / 1000).toFixed(0)}K`}
                </div>
              );
            })}
          </div>

          {/* Funnel rows */}
          {pipeline.map((p) => {
            const barPct =
              maxCount > 0 ? (p.count / maxCount) * 100 : 0;
            const color = STAGE_COLORS[p.stage] || "#C4C4C4";
            return (
              <div key={p.stage} className="group">
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-[#323338] flex-1 font-medium">
                    {dealStages[p.stage]?.label || p.stage}
                  </span>
                  <span className="text-xs text-[#9699A6]">
                    {p.count} עסקאות
                  </span>
                  <span className="text-sm font-bold text-[#323338] w-24 text-left">
                    ₪{p.value.toLocaleString()}
                  </span>
                </div>
                {/* Horizontal progress bar */}
                <div className="h-1.5 bg-[#F6F7FB] rounded-full overflow-hidden mr-5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Activity Feed Widget
// ──────────────────────────────────────────────────────────────
function ActivityFeedWidget({
  activities,
  activityTypes,
}: {
  activities: Array<{
    id: string;
    type: string;
    subject: string | null;
    body: string | null;
    contact: { id: string; firstName: string; lastName: string } | null;
    deal: { id: string; title: string } | null;
    member: { user: { name: string } };
    createdAt: string;
  }>;
  activityTypes: Record<string, { label: string }>;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#323338] text-[15px]">
            פעילות אחרונה
          </h2>
          <p className="text-[12px] text-[#676879] mt-0.5">
            כל הצוות
          </p>
        </div>
        <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-[#F6F7FB] text-[#676879]">
          {activities.length} פעילויות
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <TrendingUp size={32} className="text-[#9699A6] mb-2" />
          <p className="text-sm text-[#9699A6]">אין פעילות אחרונה</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {activities.slice(0, 10).map((a) => {
            const color = ACTIVITY_COLORS[a.type] || "#C4C4C4";
            const contactName = a.contact
              ? `${a.contact.firstName} ${a.contact.lastName}`
              : null;

            const activityTarget = a.contact
              ? `/contacts/${a.contact.id}`
              : a.deal
              ? `/deals?open=${a.deal.id}`
              : null;

            return (
              <div
                key={a.id}
                role={activityTarget ? "button" : undefined}
                tabIndex={activityTarget ? 0 : undefined}
                onClick={activityTarget ? () => navigate(activityTarget) : undefined}
                onKeyDown={activityTarget ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(activityTarget); } } : undefined}
                className={`flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-[4px] hover:bg-[#F6F7FB]/50 transition-all duration-150 group${activityTarget ? " cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1" : ""}`}
              >
                {/* Icon bubble */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5"
                  style={{ backgroundColor: color }}
                >
                  {ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.SYSTEM}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#323338] truncate leading-tight">
                    {a.subject ||
                      (contactName
                        ? `${activityTypes[a.type]?.label || a.type} — ${contactName}`
                        : activityTypes[a.type]?.label || a.type)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {contactName && (
                      <span className="text-[11px] text-[#9699A6] truncate">
                        {contactName}
                      </span>
                    )}
                    {a.deal && (
                      <>
                        <span className="text-[#9699A6] text-[10px]">·</span>
                        <span className="text-[11px] text-[#9699A6] truncate">
                          {a.deal.title}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Time + member */}
                <div className="flex-shrink-0 text-left">
                  <p className="text-xs text-[#9699A6]">
                    {formatRelativeTime(a.createdAt)}
                  </p>
                  <p className="text-[11px] text-[#9699A6] mt-0.5 truncate max-w-[80px]">
                    {a.member?.user?.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Deals At Risk Widget
// ──────────────────────────────────────────────────────────────
function DealsAtRiskWidget({
  deals,
  onOpen,
}: {
  deals: NonNullable<DashboardData["rottingDeals"]>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 border-r-[3px] border-r-[#FDAB3D]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-warning/10">
            <AlertTriangle size={18} className="text-warning" />
          </div>
          <div>
            <h2 className="font-bold text-[#323338] text-base">
              עסקאות בסיכון
            </h2>
            <p className="text-xs text-[#676879]">ללא פעילות 14+ ימים</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-warning/10 text-warning">
          {deals.length} עסקאות
        </span>
      </div>
      <div className="space-y-2">
        {deals.map((deal) => (
          <button
            key={deal.id}
            onClick={() => onOpen(deal.id)}
            className="flex items-center gap-3 p-3 bg-[#F6F7FB]/50 rounded-xl hover:bg-[#F6F7FB] transition-colors cursor-pointer group w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#323338] truncate">
                {deal.title}
              </p>
              <p className="text-xs text-[#676879] mt-0.5">
                {deal.contact?.name || "—"}{" "}
                {deal.owner && `· ${deal.owner}`}
              </p>
            </div>
            <div className="text-left flex-shrink-0">
              <p className="text-sm font-bold text-[#323338]">
                ₪{deal.value.toLocaleString()}
              </p>
              <p className="text-[10px] font-bold text-[#E44258]">
                {deal.daysSinceUpdate} ימים ללא פעילות
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// My Tasks Widget (lightweight, separate from TodaysTasksWidget)
// ──────────────────────────────────────────────────────────────
function MyTasksWidget({
  tasks,
  onNavigate,
}: {
  tasks: DashboardData["myTasks"];
  onNavigate: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#323338] text-[15px]">
            המשימות שלי
          </h2>
          <p className="text-[12px] text-[#676879] mt-0.5">פתוחות ודחופות</p>
        </div>
        <button
          onClick={onNavigate}
          className="text-[12px] font-medium text-[#0073EA] hover:underline transition-colors"
        >
          הצג הכל →
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 size={32} className="text-[#9699A6] mb-2" />
          <p className="text-sm text-[#9699A6]">אין משימות פתוחות</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.slice(0, 6).map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 px-3 py-2 bg-[#F6F7FB]/50 rounded-[4px]"
            >
              <Circle size={14} className="text-[#9699A6] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#323338] truncate">
                {t.title}
              </span>
              {t.dueDate && (
                <span className="text-[11px] text-[#9699A6] flex-shrink-0">
                  {new Date(t.dueDate).toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Minimal circle icon for MyTasksWidget rows (no extra import needed elsewhere).
function Circle({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
