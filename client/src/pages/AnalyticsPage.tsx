import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Trophy, AlertCircle, RefreshCw } from "lucide-react";
import PageShell, { PageCard } from "../components/layout/PageShell";
import {
  getActivityBreakdown,
  getDealFunnel,
  getTaskCompletion,
  getContactGrowth,
  getTopPerformers,
  type ActivityBreakdownItem,
  type DealFunnelItem,
  type TaskCompletionData,
  type ContactGrowthItem,
  type TopPerformerItem,
} from "../api/analytics";
import { ACTIVITY_TYPES, DEAL_STAGES } from "../lib/constants";

type RangeKey = "week" | "month" | "quarter" | "year" | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "השבוע" },
  { key: "month", label: "החודש" },
  { key: "quarter", label: "3 חודשים" },
  { key: "year", label: "שנה" },
  { key: "custom", label: "טווח מותאם" },
];

function getDateRange(key: RangeKey, customFrom?: string, customTo?: string) {
  const now = new Date();
  const to = now.toISOString();

  if (key === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo + "T23:59:59").toISOString() };
  }

  let from: Date;
  switch (key) {
    case "week": {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    }
    case "month": {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "quarter": {
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      break;
    }
    case "year": {
      from = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from: from.toISOString(), to };
}

// ─── Activity Breakdown Chart ───

function ActivityBreakdownChart({ data }: { data: ActivityBreakdownItem[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  if (data.length === 0) {
    return <p className="text-[13px] text-[#9699A6] text-center py-8">אין נתונים לתקופה זו</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const config = ACTIVITY_TYPES[item.type as keyof typeof ACTIVITY_TYPES];
        const label = config?.label || item.type;
        const color = config?.color || "#C4C4C4";
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.type} className="space-y-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#676879]">{label}</span>
              <span className="font-semibold text-[#323338]">{item.count}</span>
            </div>
            <div className="h-6 bg-[#F5F6F8] rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-[#9699A6] text-center pt-1">סה״כ: {total} פעילויות</p>
    </div>
  );
}

// ─── Deal Funnel Chart ───

const STAGE_ORDER: string[] = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

function DealFunnelChart({ data }: { data: DealFunnelItem[] }) {
  const sorted = useMemo(() => {
    const map = new Map(data.map((d) => [d.stage, d]));
    return STAGE_ORDER.filter((s) => map.has(s)).map((s) => map.get(s)!);
  }, [data]);

  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  if (sorted.length === 0) {
    return <p className="text-[13px] text-[#9699A6] text-center py-8">אין עסקאות בתקופה זו</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((item) => {
        const config = DEAL_STAGES[item.stage as keyof typeof DEAL_STAGES];
        const label = config?.label || item.stage;
        const color = config?.color || "#C4C4C4";
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#676879]">{label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9699A6]">
                  {item.value > 0 ? `₪${item.value.toLocaleString()}` : ""}
                </span>
                <span className="font-semibold text-[#323338]">{item.count}</span>
              </div>
            </div>
            <div className="h-5 bg-[#F5F6F8] rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Task Completion Donut ───

function TaskCompletionDonut({ data }: { data: TaskCompletionData }) {
  const { totalCreated, totalCompleted, completionRate } = data;

  if (totalCreated === 0) {
    return <p className="text-[13px] text-[#9699A6] text-center py-8">אין משימות בתקופה זו</p>;
  }

  // SVG donut
  const size = 160;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const completedArc = (completionRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F0F0F5"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#00CA72"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - completedArc}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#323338]">{completionRate}%</span>
          <span className="text-xs text-[#9699A6]">הושלמו</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#00CA72]" />
          <span className="text-[#676879]">הושלמו: {totalCompleted}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#F0F0F5]" />
          <span className="text-[#676879]">ממתינות: {totalCreated - totalCompleted}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Growth Line ───

function ContactGrowthLine({ data }: { data: ContactGrowthItem[] }) {
  if (data.length === 0) {
    return <p className="text-[13px] text-[#9699A6] text-center py-8">אין אנשי קשר חדשים בתקופה זו</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;

  // Simple bar chart for weekly data
  return (
    <div>
      <div className="flex items-end gap-1 justify-center" style={{ height: chartHeight }}>
        {data.map((item) => {
          const barHeight = Math.max((item.count / maxCount) * chartHeight, 4);
          const weekLabel = new Date(item.weekStart).toLocaleDateString("he-IL", {
            day: "numeric",
            month: "numeric",
          });
          return (
            <div key={item.weekStart} className="flex flex-col items-center gap-1 flex-1 max-w-12">
              <span className="text-[10px] font-semibold text-[#323338]">{item.count}</span>
              <div
                className="w-full rounded-t-md bg-[#579BFC] transition-all duration-500"
                style={{ height: barHeight }}
              />
              <span className="text-[10px] text-[#9699A6] whitespace-nowrap">{weekLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top Performers List ───

function TopPerformersList({ data }: { data: TopPerformerItem[] }) {
  if (data.length === 0) {
    return <p className="text-[13px] text-[#9699A6] text-center py-8">אין נתונים לתקופה זו</p>;
  }

  const maxCount = data[0]?.activitiesCount || 1;

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const pct = Math.round((item.activitiesCount / maxCount) * 100);
        return (
          <div key={item.memberId} className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-[#0073EA]/10 flex items-center justify-center text-[12px] font-bold text-[#0073EA] flex-shrink-0">
              {idx + 1}
            </span>
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={item.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-[#F5F6F8] flex items-center justify-center text-[13px] font-semibold text-[#676879] flex-shrink-0">
                {item.name.charAt(0)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#323338] font-medium truncate">{item.name}</span>
                <span className="font-semibold text-[#323338]">{item.activitiesCount}</span>
              </div>
              <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#A25DDC] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───

export default function AnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const customRangeReady = rangeKey !== "custom" || (!!customFrom && !!customTo);

  const { from, to } = useMemo(
    () => getDateRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo],
  );

  const activityQ = useQuery({
    queryKey: ["analytics", "activity-breakdown", from, to],
    queryFn: () => getActivityBreakdown(from, to),
    enabled: customRangeReady,
  });

  const funnelQ = useQuery({
    queryKey: ["analytics", "deal-funnel", from, to],
    queryFn: () => getDealFunnel(from, to),
    enabled: customRangeReady,
  });

  const taskQ = useQuery({
    queryKey: ["analytics", "task-completion", from, to],
    queryFn: () => getTaskCompletion(from, to),
    enabled: customRangeReady,
  });

  const growthQ = useQuery({
    queryKey: ["analytics", "contact-growth", from, to],
    queryFn: () => getContactGrowth(from, to),
    enabled: customRangeReady,
  });

  const performersQ = useQuery({
    queryKey: ["analytics", "top-performers", from, to],
    queryFn: () => getTopPerformers(from, to),
    enabled: customRangeReady,
  });

  return (
    <PageShell
      boardStyle
      emoji="📊"
      title="דוחות וניתוחים"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRangeKey(opt.key)}
              className={`px-3 py-1.5 text-[13px] rounded-[4px] transition-colors ${
                rangeKey === opt.key
                  ? "bg-[#0073EA] text-white font-semibold"
                  : "bg-white text-[#676879] hover:bg-[#F5F6F8] border border-[#E6E9EF]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Custom date range inputs */}
      {rangeKey === "custom" && (
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="analytics-from" className="text-[13px] text-[#676879]">מתאריך:</label>
          <input
            id="analytics-from"
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="border border-[#E6E9EF] rounded-[4px] px-3 py-1.5 text-[13px]"
          />
          <label htmlFor="analytics-to" className="text-[13px] text-[#676879]">עד תאריך:</label>
          <input
            id="analytics-to"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="border border-[#E6E9EF] rounded-[4px] px-3 py-1.5 text-[13px]"
          />
          {!customRangeReady && (
            <span className="text-[12px] text-[#FDAB3D] font-medium">יש לבחור שני תאריכים</span>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Breakdown */}
        <PageCard>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#6161FF]" />
            <h3 className="font-semibold text-[#323338]">פילוח פעילויות</h3>
          </div>
          {activityQ.isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[#F5F6F8] rounded" />
              ))}
            </div>
          ) : activityQ.isError ? (
            <div className="flex flex-col items-center gap-2 justify-center py-8">
              <div className="flex items-center gap-2 text-[13px] text-[#E44258]">
                <AlertCircle size={16} />
                <span>שגיאה בטעינת נתונים</span>
              </div>
              <button
                onClick={() => activityQ.refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
              >
                <RefreshCw size={12} />
                נסה שוב
              </button>
            </div>
          ) : (
            <ActivityBreakdownChart data={activityQ.data || []} />
          )}
        </PageCard>

        {/* Deal Funnel */}
        <PageCard>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#00CA72]" />
            <h3 className="font-semibold text-[#323338]">משפך עסקאות</h3>
          </div>
          {funnelQ.isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-[#F5F6F8] rounded" />
              ))}
            </div>
          ) : funnelQ.isError ? (
            <div className="flex flex-col items-center gap-2 justify-center py-8">
              <div className="flex items-center gap-2 text-[13px] text-[#E44258]">
                <AlertCircle size={16} />
                <span>שגיאה בטעינת נתונים</span>
              </div>
              <button
                onClick={() => funnelQ.refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
              >
                <RefreshCw size={12} />
                נסה שוב
              </button>
            </div>
          ) : (
            <DealFunnelChart data={funnelQ.data || []} />
          )}
        </PageCard>

        {/* Task Completion */}
        <PageCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-[#00CA72]" />
            <h3 className="font-semibold text-[#323338]">השלמת משימות</h3>
          </div>
          {taskQ.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-32 h-32 rounded-full bg-[#F5F6F8] animate-pulse" />
            </div>
          ) : taskQ.isError ? (
            <div className="flex flex-col items-center gap-2 justify-center py-8">
              <div className="flex items-center gap-2 text-[13px] text-[#E44258]">
                <AlertCircle size={16} />
                <span>שגיאה בטעינת נתונים</span>
              </div>
              <button
                onClick={() => taskQ.refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
              >
                <RefreshCw size={12} />
                נסה שוב
              </button>
            </div>
          ) : (
            <TaskCompletionDonut data={taskQ.data || { totalCreated: 0, totalCompleted: 0, pending: 0, completionRate: 0 }} />
          )}
        </PageCard>

        {/* Contact Growth */}
        <PageCard>
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-[#579BFC]" />
            <h3 className="font-semibold text-[#323338]">גידול אנשי קשר</h3>
          </div>
          {growthQ.isLoading ? (
            <div className="animate-pulse flex items-end gap-1 justify-center" style={{ height: 120 }}>
              {[60, 85, 40, 95, 55].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 max-w-12 bg-[#F5F6F8] rounded-t"
                  style={{ height: h }}
                />
              ))}
            </div>
          ) : growthQ.isError ? (
            <div className="flex flex-col items-center gap-2 justify-center py-8">
              <div className="flex items-center gap-2 text-[13px] text-[#E44258]">
                <AlertCircle size={16} />
                <span>שגיאה בטעינת נתונים</span>
              </div>
              <button
                onClick={() => growthQ.refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
              >
                <RefreshCw size={12} />
                נסה שוב
              </button>
            </div>
          ) : (
            <ContactGrowthLine data={growthQ.data || []} />
          )}
        </PageCard>

        {/* Top Performers */}
        <PageCard className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#FDAB3D]" />
            <h3 className="font-semibold text-[#323338]">מובילי פעילות</h3>
          </div>
          {performersQ.isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#F5F6F8]" />
                  <div className="w-8 h-8 rounded-full bg-[#F5F6F8]" />
                  <div className="flex-1 h-6 bg-[#F5F6F8] rounded" />
                </div>
              ))}
            </div>
          ) : performersQ.isError ? (
            <div className="flex flex-col items-center gap-2 justify-center py-8">
              <div className="flex items-center gap-2 text-[13px] text-[#E44258]">
                <AlertCircle size={16} />
                <span>שגיאה בטעינת נתונים</span>
              </div>
              <button
                onClick={() => performersQ.refetch()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
              >
                <RefreshCw size={12} />
                נסה שוב
              </button>
            </div>
          ) : (
            <TopPerformersList data={performersQ.data || []} />
          )}
        </PageCard>
      </div>
    </PageShell>
  );
}
