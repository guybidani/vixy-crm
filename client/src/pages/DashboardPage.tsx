import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "../lib/utils";
import { useNavigate } from "react-router-dom";
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
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../api/dashboard";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import CalendarWidget from "../components/dashboard/CalendarWidget";
import TodaysTasksWidget from "../components/dashboard/TodaysTasksWidget";
import TeamLeaderboard from "../components/dashboard/TeamLeaderboard";

const STAGE_COLORS: Record<string, string> = {
  LEAD: "#C4C4C4",
  QUALIFIED: "#A25DDC",
  PROPOSAL: "#6161FF",
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
  NOTE: "#6161FF",
  CALL: "#00CA72",
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

export default function DashboardPage() {
  const { dealStages, activityTypes } = useWorkspaceOptions();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  if (isLoading || !data) {
    return (
      <div>
        {/* Loading header */}
        <div className="mb-6">
          <div className="h-8 w-56 bg-surface-secondary rounded-xl animate-pulse mb-2" />
          <div className="h-4 w-40 bg-surface-secondary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-card p-6 h-28 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, pipeline, recentActivities, rottingDeals } = data;

  // Compute calls this week from recentActivities (CALL type in the feed + kpis data)
  const callsThisWeek = recentActivities.filter((a) => a.type === "CALL").length;

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-0.5">
            שלום, {user?.name} 👋
          </h1>
          <p className="text-sm text-text-secondary">
            {formatTodayDate()} · {getTodayMotivational()}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <QuickActionButton
            label="+ ליד חדש"
            color="#6161FF"
            bg="#E8E8FF"
            onClick={() => navigate("/contacts?new=1")}
          />
          <QuickActionButton
            label="+ עסקה חדשה"
            color="#00CA72"
            bg="#D6F5E8"
            onClick={() => navigate("/deals?new=1")}
          />
          <QuickActionButton
            label="+ משימה"
            color="#FDAB3D"
            bg="#FEF0D8"
            onClick={() => navigate("/tasks?new=1")}
          />
        </div>
      </div>

      {/* ===== STATS ROW (4 KPI cards) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 [&>*:nth-child(1)]:animate-fade-in-up [&>*:nth-child(2)]:animate-fade-in-up [&>*:nth-child(2)]:[animation-delay:50ms] [&>*:nth-child(3)]:animate-fade-in-up [&>*:nth-child(3)]:[animation-delay:100ms] [&>*:nth-child(4)]:animate-fade-in-up [&>*:nth-child(4)]:[animation-delay:150ms]">
        {/* לידים חדשים השבוע */}
        <StatCard
          borderColor="#6161FF"
          icon={<Users size={22} />}
          iconBg="#E8E8FF"
          iconColor="#6161FF"
          label="לידים חדשים השבוע"
          value={kpis.contactsThisWeek}
          subValue={`סה"כ ${kpis.contactsTotal}`}
          trend={kpis.contactsThisWeek > 0 ? "up" : "neutral"}
          trendLabel={kpis.contactsThisWeek > 0 ? `+${kpis.contactsThisWeek} השבוע` : "אין לידים חדשים"}
          onClick={() => navigate("/contacts")}
        />

        {/* עסקאות פתוחות */}
        <StatCard
          borderColor="#00CA72"
          icon={<Handshake size={22} />}
          iconBg="#D6F5E8"
          iconColor="#00CA72"
          label="עסקאות פתוחות"
          value={kpis.dealsOpenCount}
          subValue={`₪${kpis.totalPipelineValue.toLocaleString()}`}
          trend="neutral"
          trendLabel={`שווי צינור`}
          onClick={() => navigate("/deals")}
        />

        {/* משימות להיום */}
        <StatCard
          borderColor={kpis.tasksOverdue > 0 ? "#FF4D4F" : "#A25DDC"}
          icon={<CheckCircle2 size={22} />}
          iconBg={kpis.tasksOverdue > 0 ? "#FFE8E8" : "#EDE1F5"}
          iconColor={kpis.tasksOverdue > 0 ? "#FF4D4F" : "#A25DDC"}
          label="משימות להיום"
          value={kpis.tasksToday}
          subValue={
            kpis.tasksOverdue > 0
              ? `${kpis.tasksOverdue} באיחור`
              : "הכל בזמן"
          }
          trend={kpis.tasksOverdue > 0 ? "down" : "up"}
          trendLabel={
            kpis.tasksOverdue > 0
              ? `${kpis.tasksOverdue} באיחור!`
              : `${kpis.tasksCompletedThisWeek} הושלמו השבוע`
          }
          onClick={() => navigate("/tasks")}
        />

        {/* שיחות השבוע */}
        <StatCard
          borderColor="#579BFC"
          icon={<Phone size={22} />}
          iconBg="#E3EFFE"
          iconColor="#579BFC"
          label="שיחות השבוע"
          value={callsThisWeek}
          subValue={`מתוך ${recentActivities.length} פעילויות`}
          trend={callsThisWeek > 0 ? "up" : "neutral"}
          trendLabel={callsThisWeek > 0 ? `${callsThisWeek} שיחות` : "לא נרשמו שיחות"}
          onClick={() => navigate("/contacts")}
        />
      </div>

      {/* ===== MAIN GRID: Pipeline + Activity Feed ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pipeline Funnel Widget */}
        <PipelineFunnelWidget
          pipeline={pipeline}
          totalValue={kpis.totalPipelineValue}
          dealStages={dealStages}
          onNavigate={() => navigate("/deals")}
        />

        {/* Activity Feed Widget */}
        <ActivityFeedWidget
          activities={recentActivities}
          activityTypes={activityTypes}
        />
      </div>

      {/* ===== TEAM + CALENDAR ===== */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <TeamLeaderboard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <CalendarWidget />
      </div>

      {/* ===== AT RISK DEALS ===== */}
      {rottingDeals && rottingDeals.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5 mb-6 border-t-4 border-t-warning">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-warning/10">
                <AlertTriangle size={18} className="text-warning" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary text-base">
                  עסקאות בסיכון
                </h2>
                <p className="text-xs text-text-secondary">
                  ללא פעילות 14+ ימים
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-warning/10 text-warning">
              {rottingDeals.length} עסקאות
            </span>
          </div>
          <div className="space-y-2">
            {rottingDeals.map((deal: any) => (
              <div
                key={deal.id}
                onClick={() => navigate("/deals")}
                className="flex items-center gap-3 p-3 bg-surface-secondary/50 rounded-xl hover:bg-surface-secondary transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {deal.title}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {deal.contact?.name || "—"}{" "}
                    {deal.owner && `· ${deal.owner}`}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-sm font-bold text-text-primary">
                    ₪{deal.value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-danger">
                    {deal.daysSinceUpdate} ימים ללא פעילות
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TODAY'S TASKS ===== */}
      <TodaysTasksWidget />
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 hover:scale-[1.04] active:scale-[0.97] shadow-sm"
      style={{ backgroundColor: bg, color }}
    >
      <Plus size={13} />
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
      ? "#00CA72"
      : trend === "down"
        ? "#FF4D4F"
        : "#9CA3AF";

  return (
    <div
      onClick={onClick}
      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card p-5 cursor-pointer hover:shadow-card-hover hover:scale-[1.02] hover:bg-white transition-all duration-200 border-t-4 active:scale-[0.97] group"
      style={{ borderTopColor: borderColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div
          className="flex items-center gap-0.5 text-[11px] font-bold"
          style={{ color: trendColor }}
        >
          <TrendIcon size={13} />
          <span>{trendLabel}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-text-primary leading-tight">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      <p className="text-xs text-text-tertiary mt-1 font-medium">{subValue}</p>
    </div>
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
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-text-primary text-base">
            צינור מכירות
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            לפי שלב
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-secondary text-text-secondary">
            ₪{totalValue.toLocaleString()}
          </span>
          <button
            onClick={onNavigate}
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            הצג הכל →
          </button>
        </div>
      </div>

      {pipeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Handshake size={32} className="text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">אין עסקאות פתוחות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stacked horizontal bar */}
          <div className="flex rounded-xl overflow-hidden h-8 mb-5 shadow-inner bg-surface-secondary gap-0.5">
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
                  <span className="text-sm text-text-primary flex-1 font-medium">
                    {dealStages[p.stage]?.label || p.stage}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {p.count} עסקאות
                  </span>
                  <span className="text-sm font-bold text-text-primary w-24 text-left">
                    ₪{p.value.toLocaleString()}
                  </span>
                </div>
                {/* Horizontal progress bar */}
                <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden mr-5">
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
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-text-primary text-base">
            פעילות אחרונה
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            כל הצוות
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-secondary text-text-secondary">
          {activities.length} פעילויות
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <TrendingUp size={32} className="text-text-tertiary mb-2" />
          <p className="text-sm text-text-tertiary">אין פעילות אחרונה</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {activities.slice(0, 10).map((a) => {
            const color = ACTIVITY_COLORS[a.type] || "#C4C4C4";
            const contactName = a.contact
              ? `${a.contact.firstName} ${a.contact.lastName}`
              : null;

            return (
              <div
                key={a.id}
                className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-secondary/50 transition-all duration-150 group"
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
                  <p className="text-sm text-text-primary truncate leading-tight">
                    {a.subject ||
                      (contactName
                        ? `${activityTypes[a.type]?.label || a.type} — ${contactName}`
                        : activityTypes[a.type]?.label || a.type)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {contactName && (
                      <span className="text-[11px] text-text-tertiary truncate">
                        {contactName}
                      </span>
                    )}
                    {a.deal && (
                      <>
                        <span className="text-text-tertiary text-[10px]">·</span>
                        <span className="text-[11px] text-text-tertiary truncate">
                          {a.deal.title}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Time + member */}
                <div className="flex-shrink-0 text-left">
                  <p className="text-xs text-text-tertiary">
                    {formatRelativeTime(a.createdAt)}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 truncate max-w-[80px]">
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
