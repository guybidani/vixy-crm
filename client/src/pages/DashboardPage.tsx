import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Handshake,
  Ticket,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../api/dashboard";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import CalendarWidget from "../components/dashboard/CalendarWidget";

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

export default function DashboardPage() {
  const { dealStages, activityTypes, priorities } = useWorkspaceOptions();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          שלום, {user?.name}!
        </h1>
        <p className="text-sm text-text-secondary mb-6">טוען נתונים...</p>
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

  const { kpis, pipeline, recentActivities, myTasks } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">
        שלום, {user?.name}!
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        הנה סיכום יומי של העסק שלך
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 [&>*:nth-child(1)]:animate-fade-in-up [&>*:nth-child(2)]:animate-fade-in-up [&>*:nth-child(2)]:[animation-delay:50ms] [&>*:nth-child(3)]:animate-fade-in-up [&>*:nth-child(3)]:[animation-delay:100ms] [&>*:nth-child(4)]:animate-fade-in-up [&>*:nth-child(4)]:[animation-delay:150ms]">
        <KpiCard
          borderColor="#6161FF"
          icon={<Users size={24} />}
          iconBg="#E8E8FF"
          iconColor="#6161FF"
          label="אנשי קשר"
          value={kpis.contactsTotal}
          change={`+${kpis.contactsThisWeek} השבוע`}
          changePositive
          onClick={() => navigate("/contacts")}
        />
        <KpiCard
          borderColor="#00CA72"
          icon={<Handshake size={24} />}
          iconBg="#D6F5E8"
          iconColor="#00CA72"
          label="עסקאות פתוחות"
          value={kpis.dealsOpenCount}
          change={`₪${kpis.totalPipelineValue.toLocaleString()}`}
          onClick={() => navigate("/deals")}
        />
        <KpiCard
          borderColor="#FDAB3D"
          icon={<Ticket size={24} />}
          iconBg="#FEF0D8"
          iconColor="#FDAB3D"
          label="פניות פתוחות"
          value={kpis.ticketsOpen}
          change={
            kpis.ticketsUrgent > 0 ? `${kpis.ticketsUrgent} דחוף` : "הכל בסדר"
          }
          changePositive={kpis.ticketsUrgent === 0}
          onClick={() => navigate("/tickets")}
        />
        <KpiCard
          borderColor="#A25DDC"
          icon={<CheckCircle2 size={24} />}
          iconBg="#EDE1F5"
          iconColor="#A25DDC"
          label="משימות להיום"
          value={kpis.tasksToday}
          change={
            kpis.tasksOverdue > 0 ? `${kpis.tasksOverdue} באיחור` : "הכל בזמן"
          }
          changePositive={kpis.tasksOverdue === 0}
          onClick={() => navigate("/tasks")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pipeline Chart */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-text-primary text-base">
              צינור מכירות
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-secondary text-text-secondary">
              ₪{kpis.totalPipelineValue.toLocaleString()}
            </span>
          </div>
          {pipeline.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              אין עסקאות פתוחות
            </p>
          ) : (
            <>
              {/* Horizontal bar */}
              <div className="flex rounded-full overflow-hidden h-9 mb-4 shadow-inner bg-surface-secondary">
                {pipeline.map((p) => {
                  const pct =
                    kpis.totalPipelineValue > 0
                      ? (p.value / kpis.totalPipelineValue) * 100
                      : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={p.stage}
                      className="flex items-center justify-center text-white text-[10px] font-bold transition-all duration-500 hover:brightness-110"
                      style={{
                        backgroundColor: STAGE_COLORS[p.stage] || "#C4C4C4",
                        width: `${Math.max(pct, 8)}%`,
                      }}
                    >
                      {pct > 12 && `₪${(p.value / 1000).toFixed(0)}K`}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {pipeline.map((p) => (
                  <div key={p.stage} className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-surface-secondary/60 transition-colors">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: STAGE_COLORS[p.stage] || "#C4C4C4",
                      }}
                    />
                    <span className="text-sm text-text-primary flex-1">
                      {dealStages[p.stage]?.label || p.stage}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {p.count} עסקאות
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      ₪{p.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-text-primary text-base">
              פעילות אחרונה
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-secondary text-text-secondary">
              {recentActivities.length} פעילויות
            </span>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              אין פעילות אחרונה
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivities.slice(0, 6).map((a) => {
                const color = ACTIVITY_COLORS[a.type] || "#C4C4C4";
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2.5 border-r-[3px] pr-3 rounded-lg hover:bg-surface-secondary/50 transition-all duration-150 hover:translate-x-[-2px]"
                    style={{ borderRightColor: color }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.SYSTEM}
                    </div>
                    <span className="text-sm text-text-primary flex-1 truncate">
                      {a.subject ||
                        (a.contact
                          ? `${activityTypes[a.type]?.label || a.type} - ${a.contact.firstName} ${a.contact.lastName}`
                          : a.type)}
                    </span>
                    <span className="text-xs text-text-tertiary flex-shrink-0">
                      {formatRelativeTime(a.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Calendar Widget */}
        <CalendarWidget />
      </div>

      {/* My Tasks */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-text-primary text-base">המשימות שלי</h2>
            {/* Task stat badges */}
            <div className="flex items-center gap-1.5">
              {kpis.tasksOverdue > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                  {kpis.tasksOverdue} באיחור
                </span>
              )}
              {kpis.tasksToday > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                  {kpis.tasksToday} להיום
                </span>
              )}
              {(kpis.tasksCompletedThisWeek ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                  {kpis.tasksCompletedThisWeek} הושלמו השבוע
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/tasks")}
            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
          >
            הצג הכל
            <ArrowLeft size={12} />
          </button>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">
            אין משימות פתוחות
          </p>
        ) : (
          <div className="space-y-1">
            {myTasks.map((t) => {
              const p = priorities[t.priority] || priorities.MEDIUM;
              const isOverdue =
                t.dueDate &&
                t.status !== "DONE" &&
                new Date(t.dueDate) < new Date();
              const isDueToday =
                t.dueDate &&
                t.status !== "DONE" &&
                !isOverdue &&
                new Date(t.dueDate).toDateString() ===
                  new Date().toDateString();
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-secondary/50 transition-colors cursor-pointer ${
                    isOverdue ? "bg-danger/[0.03]" : ""
                  }`}
                  onClick={() => navigate("/tasks")}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 hover:border-success cursor-pointer transition-colors ${
                      isOverdue ? "border-danger" : "border-border"
                    }`}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      isOverdue
                        ? "text-danger font-medium"
                        : "text-text-primary"
                    }`}
                  >
                    {t.title}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-white min-w-[48px] text-center"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.label}
                  </span>
                  <span
                    className={`text-xs ${
                      isOverdue
                        ? "text-danger font-semibold"
                        : isDueToday
                          ? "text-warning font-semibold"
                          : "text-text-tertiary"
                    }`}
                  >
                    {isOverdue
                      ? "באיחור!"
                      : isDueToday
                        ? "היום"
                        : t.dueDate
                          ? formatRelativeTime(t.dueDate)
                          : "ללא תאריך"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return "היום";
    if (futureDays === 1) return "מחר";
    return `בעוד ${futureDays} ימים`;
  }

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

function KpiCard({
  borderColor,
  icon,
  iconBg,
  iconColor,
  label,
  value,
  change,
  changePositive,
  onClick,
}: {
  borderColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  change: string;
  changePositive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card p-5 cursor-pointer hover:shadow-card-hover hover:scale-[1.02] hover:bg-white transition-all duration-200 border-t-4 active:scale-[0.97] group"
      style={{ borderTopColor: borderColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            changePositive
              ? "bg-success-light text-success"
              : "bg-surface-secondary text-text-secondary"
          }`}
        >
          {change}
        </span>
      </div>
      <p className="text-3xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
    </div>
  );
}
