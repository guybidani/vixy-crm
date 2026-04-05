import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getDealsPipeline, listDeals } from "../../api/deals";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

export default function DealsChartView() {
  const { dealStages, priorities } = useWorkspaceOptions();
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["deals-pipeline"],
    queryFn: getDealsPipeline,
  });

  const { data: allDeals } = useQuery({
    queryKey: ["deals", { limit: 500 }],
    queryFn: () => listDeals({ limit: 500 }),
  });

  if (pipelineLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#676879]">טוען נתונים...</p>
      </div>
    );
  }

  if (!pipelineData) return null;

  // ── Data preparation ──
  const stageData = pipelineData.totals.map((t) => {
    const info = dealStages[t.stage];
    return {
      name: info?.label || t.stage,
      count: t.count,
      value: t.totalValue,
      fill: info?.color || "#C4C4C4",
    };
  });

  // Funnel: only open stages
  const funnelStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
  const funnelData = funnelStages
    .map((s) => {
      const t = pipelineData.totals.find((x) => x.stage === s);
      const info = dealStages[s];
      return {
        name: info?.label || s,
        value: t?.count || 0,
        fill: info?.color || "#C4C4C4",
      };
    })
    .filter((d) => d.value > 0);

  // Priority distribution
  const priorityCounts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };
  if (allDeals?.data) {
    for (const d of allDeals.data) {
      priorityCounts[d.priority] = (priorityCounts[d.priority] || 0) + 1;
    }
  }
  const priorityData = Object.entries(priorities).map(([key, info]) => ({
    name: info.label,
    value: priorityCounts[key] || 0,
    fill: info.color,
  }));

  // Win rate
  const wonCount =
    pipelineData.totals.find((t) => t.stage === "CLOSED_WON")?.count || 0;
  const lostCount =
    pipelineData.totals.find((t) => t.stage === "CLOSED_LOST")?.count || 0;
  const closedTotal = wonCount + lostCount;
  const winRate =
    closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  // Total pipeline value (open stages only)
  const totalPipelineValue = pipelineData.totals
    .filter((t) => funnelStages.includes(t.stage))
    .reduce((sum, t) => sum + t.totalValue, 0);

  const totalDeals = pipelineData.totals.reduce((sum, t) => sum + t.count, 0);

  const wonValue =
    pipelineData.totals.find((t) => t.stage === "CLOSED_WON")?.totalValue || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="סה״כ עסקאות"
          value={String(totalDeals)}
          color="#579BFC"
        />
        <KpiCard
          label="שווי צינור"
          value={`₪${totalPipelineValue.toLocaleString()}`}
          color="#6161FF"
        />
        <KpiCard
          label="סגירות מוצלחות"
          value={`₪${wonValue.toLocaleString()}`}
          sub={`${wonCount} עסקאות`}
          color="#00CA72"
        />
        <KpiCard
          label="שיעור סגירה"
          value={`${winRate}%`}
          sub={`${wonCount}/${closedTotal}`}
          color={
            winRate >= 50 ? "#00CA72" : winRate >= 30 ? "#FDAB3D" : "#FB275D"
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Stage */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E6E9EF]">
          <h3 className="text-[15px] font-bold text-[#323338] mb-4">
            שווי לפי שלב
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                type="number"
                tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
                fontSize={11}
                stroke="#9699A6"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                fontSize={12}
                stroke="#676879"
              />
              <Tooltip
                formatter={(v: number) => [`₪${v.toLocaleString()}`, "שווי"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E6E9EF",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stageData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Count by Stage */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E6E9EF]">
          <h3 className="text-[15px] font-bold text-[#323338] mb-4">
            כמות עסקאות לפי שלב
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="name" fontSize={11} stroke="#9699A6" />
              <YAxis fontSize={11} stroke="#9699A6" allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, "עסקאות"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E6E9EF",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stageData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E6E9EF]">
          <h3 className="text-[15px] font-bold text-[#323338] mb-4">
            משפך מכירות
          </h3>
          {funnelData.length > 0 ? (
            <div className="space-y-2">
              {funnelData.map((d) => {
                const maxCount = Math.max(...funnelData.map((x) => x.value));
                const pct = maxCount > 0 ? (d.value / maxCount) * 100 : 0;
                return (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#676879] w-20 text-left">
                      {d.name}
                    </span>
                    <div className="flex-1 h-8 bg-[#F5F6F8] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all flex items-center justify-end px-2"
                        style={{
                          width: `${Math.max(pct, 8)}%`,
                          backgroundColor: d.fill,
                        }}
                      >
                        <span className="text-white text-xs font-bold">
                          {d.value}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-[#676879] text-sm">
              אין עסקאות פתוחות
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E6E9EF]">
          <h3 className="text-[15px] font-bold text-[#323338] mb-4">
            התפלגות עדיפויות
          </h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {priorityData
                    .filter((d) => d.value > 0)
                    .map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [v, "עסקאות"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E6E9EF",
                    fontSize: "13px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {priorityData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-[13px] text-[#323338]">{d.name}</span>
                  <span className="text-[12px] text-[#676879] font-semibold">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E6E9EF]">
      <p className="text-[12px] text-[#676879] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }} dir="ltr">
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#9699A6] mt-0.5">{sub}</p>}
    </div>
  );
}
