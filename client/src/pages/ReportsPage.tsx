import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2,
  TrendingUp,
  Users,
  PieChart,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Legend,
} from "recharts";
import PageShell, { PageCard } from "../components/layout/PageShell";
import { getDealGrowth, getDealFunnel, getLeadSources } from "../api/analytics";
import { getTeamPerformance } from "../api/dashboard";
import { DEAL_STAGES } from "../lib/constants";

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeeklyRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 56); // 8 weeks back
  return { from: from.toISOString(), to: now.toISOString() };
}

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString(), to: now.toISOString() };
}

// ── 1. Deals Timeline (Line Chart) ───────────────────────────────────────────

function DealsTimeline() {
  const { from, to } = useMemo(() => getWeeklyRange(), []);
  const q = useQuery({
    queryKey: ["reports", "deals-timeline", from, to],
    queryFn: () => getDealGrowth(from, to),
  });

  const data = useMemo(() => {
    if (!q.data) return [];
    return q.data.map((item) => ({
      week: new Date(item.weekStart).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "numeric",
      }),
      עסקאות: item.count,
    }));
  }, [q.data]);

  return (
    <PageCard>
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={18} className="text-[#6161FF]" />
        <h3 className="font-semibold text-[#323338]">עסקאות לאורך זמן</h3>
        <span className="text-[12px] text-[#9699A6] mr-auto">8 שבועות אחרונים</span>
      </div>
      {q.isLoading ? (
        <div className="animate-pulse h-48 bg-[#F5F6F8] rounded-lg" />
      ) : q.isError ? (
        <div className="flex items-center gap-2 justify-center py-12 text-[13px] text-[#E44258]">
          <AlertCircle size={16} />
          <span>שגיאה בטעינת נתונים</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-[13px] text-[#9699A6] text-center py-12">אין נתונים לתקופה זו</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF3" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#676879" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#676879" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #EEEFF3",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="עסקאות"
              stroke="#6161FF"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#6161FF", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </PageCard>
  );
}

// ── 2. Pipeline by Stage (Horizontal Bar Chart) ───────────────────────────────

const STAGE_ORDER = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

function PipelineByStage() {
  const { from, to } = useMemo(() => getMonthRange(), []);
  const q = useQuery({
    queryKey: ["reports", "pipeline-stage", from, to],
    queryFn: () => getDealFunnel(from, to),
  });

  const data = useMemo(() => {
    if (!q.data) return [];
    const map = new Map(q.data.map((d) => [d.stage, d]));
    return STAGE_ORDER.filter((s) => map.has(s)).map((s) => {
      const d = map.get(s)!;
      const config = DEAL_STAGES[s as keyof typeof DEAL_STAGES];
      return {
        name: config?.label || s,
        עסקאות: d.count,
        ערך: d.value,
        color: config?.color || "#C4C4C4",
      };
    });
  }, [q.data]);

  // Custom tooltip showing both count and value
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = data.find((d) => d.name === label);
    return (
      <div className="bg-white border border-[#EEEFF3] rounded-lg p-3 shadow-sm text-[13px]">
        <p className="font-semibold text-[#323338] mb-1">{label}</p>
        <p className="text-[#676879]">{payload[0].value} עסקאות</p>
        {entry && entry.ערך > 0 && (
          <p className="text-[#9699A6]">₪{entry.ערך.toLocaleString()}</p>
        )}
      </div>
    );
  };

  return (
    <PageCard>
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={18} className="text-[#00CA72]" />
        <h3 className="font-semibold text-[#323338]">פייפליין לפי שלב</h3>
        <span className="text-[12px] text-[#9699A6] mr-auto">החודש</span>
      </div>
      {q.isLoading ? (
        <div className="animate-pulse h-48 bg-[#F5F6F8] rounded-lg" />
      ) : q.isError ? (
        <div className="flex items-center gap-2 justify-center py-12 text-[13px] text-[#E44258]">
          <AlertCircle size={16} />
          <span>שגיאה בטעינת נתונים</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-[13px] text-[#9699A6] text-center py-12">אין עסקאות לתקופה זו</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF3" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#676879" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#676879" }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="עסקאות" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </PageCard>
  );
}

// ── 3. Team Performance Table ─────────────────────────────────────────────────

function TeamPerformance() {
  const q = useQuery({
    queryKey: ["reports", "team-performance"],
    queryFn: getTeamPerformance,
  });

  const sorted = useMemo(() => {
    if (!q.data) return [];
    return [...q.data].sort((a, b) => b.dealsWon - a.dealsWon);
  }, [q.data]);

  return (
    <PageCard>
      <div className="flex items-center gap-2 mb-5">
        <Users size={18} className="text-[#A25DDC]" />
        <h3 className="font-semibold text-[#323338]">ביצועי צוות</h3>
        <span className="text-[12px] text-[#9699A6] mr-auto">החודש</span>
      </div>
      {q.isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#F5F6F8] rounded" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="flex items-center gap-2 justify-center py-12 text-[13px] text-[#E44258]">
          <AlertCircle size={16} />
          <span>שגיאה בטעינת נתונים</span>
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-[13px] text-[#9699A6] text-center py-12">אין נתונים לתקופה זו</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#EEEFF3]">
                <th className="text-right py-2 pr-1 font-semibold text-[#676879] text-[12px]">
                  נציג
                </th>
                <th className="text-center py-2 font-semibold text-[#676879] text-[12px]">
                  עסקאות שנסגרו
                </th>
                <th className="text-center py-2 font-semibold text-[#676879] text-[12px]">
                  שיחות
                </th>
                <th className="text-center py-2 font-semibold text-[#676879] text-[12px]">
                  משימות הושלמו
                </th>
                <th className="text-left py-2 pl-1 font-semibold text-[#676879] text-[12px]">
                  ערך שנסגר
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((member, idx) => (
                <tr
                  key={member.memberId}
                  className={`border-b border-[#F5F6F8] ${idx % 2 === 0 ? "" : "bg-[#FAFBFC]"}`}
                >
                  <td className="py-2.5 pr-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0073EA] to-[#0060C2] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {member.name.charAt(0)}
                      </span>
                      <span className="font-medium text-[#323338] truncate max-w-[120px]">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${
                        member.dealsWon > 0
                          ? "bg-[#E6FBF1] text-[#00CA72]"
                          : "text-[#9699A6]"
                      }`}
                    >
                      {member.dealsWon}
                    </span>
                  </td>
                  <td className="text-center py-2.5 text-[#676879]">
                    {member.callsCount}
                  </td>
                  <td className="text-center py-2.5 text-[#676879]">
                    {member.tasksCompleted}
                  </td>
                  <td className="text-left py-2.5 pl-1 text-[#676879]">
                    {member.dealsWonValue > 0
                      ? `₪${member.dealsWonValue.toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageCard>
  );
}

// ── 4. Lead Sources Donut ─────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "אתר",
  REFERRAL: "הפניה",
  MANUAL: "ידני",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  EMAIL: "אימייל",
  PHONE: "טלפון",
  OTHER: "אחר",
};

const SOURCE_COLORS = [
  "#6161FF",
  "#00CA72",
  "#FDAB3D",
  "#579BFC",
  "#A25DDC",
  "#FF642E",
  "#FB275D",
  "#66CCFF",
  "#C4C4C4",
];

function LeadSources() {
  const q = useQuery({
    queryKey: ["reports", "lead-sources"],
    queryFn: getLeadSources,
  });

  const data = useMemo(() => {
    if (!q.data) return [];
    return [...q.data]
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({
        name: SOURCE_LABELS[item.source] || item.source,
        value: item.count,
        color: SOURCE_COLORS[idx % SOURCE_COLORS.length],
      }));
  }, [q.data]);

  const total = data.reduce((s, d) => s + d.value, 0);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <PageCard>
      <div className="flex items-center gap-2 mb-5">
        <PieChart size={18} className="text-[#FDAB3D]" />
        <h3 className="font-semibold text-[#323338]">מקורות לידים</h3>
        <span className="text-[12px] text-[#9699A6] mr-auto">סה״כ: {total}</span>
      </div>
      {q.isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-40 h-40 rounded-full bg-[#F5F6F8] animate-pulse" />
        </div>
      ) : q.isError ? (
        <div className="flex items-center gap-2 justify-center py-12 text-[13px] text-[#E44258]">
          <AlertCircle size={16} />
          <span>שגיאה בטעינת נתונים</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-[13px] text-[#9699A6] text-center py-12">אין נתונים</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #EEEFF3",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: "#676879" }}>{value}</span>
                )}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <PageShell
      boardStyle
      emoji="📈"
      title="דוחות"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DealsTimeline />
        <PipelineByStage />
        <TeamPerformance />
        <LeadSources />
      </div>
    </PageShell>
  );
}
