import { prisma } from "../db/client";
import { SEVEN_DAYS_MS, FOURTEEN_DAYS_MS } from "../lib/constants";

/** Sunday 00:00 of the current week (Israeli work-week start) */
function getThisWeekSunday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

export interface TeamMemberPerformance {
  memberId: string;
  name: string;
  activitiesCount: number;
  callsCount: number;
  dealsWon: number;
  dealsWonValue: number;
  tasksCompleted: number;
}

interface TeamPerformanceRow {
  member_id: string;
  name: string;
  activities_count: bigint;
  calls_count: bigint;
  deals_won: bigint;
  deals_won_value: number | null;
  tasks_completed: bigint;
}

export async function getTeamPerformance(
  workspaceId: string,
): Promise<TeamMemberPerformance[]> {
  const weekStart = getThisWeekSunday();

  // Use LEFT JOINs with conditional aggregation instead of 5 correlated
  // subqueries per member.  The previous pattern executed O(5 * N) sub-SELECTs
  // where N = workspace members.  This single-pass approach scans each table
  // once and aggregates per-member in the same query.
  const rows = await prisma.$queryRaw<TeamPerformanceRow[]>`
    SELECT
      wm.id AS member_id,
      u.name,
      COALESCE(a_stats.activities_count, 0) AS activities_count,
      COALESCE(a_stats.calls_count, 0) AS calls_count,
      COALESCE(d_stats.deals_won, 0) AS deals_won,
      COALESCE(d_stats.deals_won_value, 0) AS deals_won_value,
      COALESCE(t_stats.tasks_completed, 0) AS tasks_completed
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    LEFT JOIN (
      SELECT a.member_id,
             COUNT(*) AS activities_count,
             COUNT(*) FILTER (WHERE a.type = 'CALL') AS calls_count
      FROM activities a
      WHERE a.workspace_id = ${workspaceId} AND a.created_at >= ${weekStart}
      GROUP BY a.member_id
    ) a_stats ON a_stats.member_id = wm.id
    LEFT JOIN (
      SELECT d.assignee_id,
             COUNT(*) AS deals_won,
             SUM(d.value) AS deals_won_value
      FROM deals d
      WHERE d.workspace_id = ${workspaceId} AND d.stage = 'CLOSED_WON' AND d.stage_changed_at >= ${weekStart}
      GROUP BY d.assignee_id
    ) d_stats ON d_stats.assignee_id = wm.id
    LEFT JOIN (
      SELECT t.assignee_id,
             COUNT(*) AS tasks_completed
      FROM tasks t
      WHERE t.workspace_id = ${workspaceId} AND t.status = 'DONE' AND t.completed_at >= ${weekStart}
      GROUP BY t.assignee_id
    ) t_stats ON t_stats.assignee_id = wm.id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY activities_count DESC
  `;

  return rows.map((r) => ({
    memberId: r.member_id,
    name: r.name,
    activitiesCount: Number(r.activities_count),
    callsCount: Number(r.calls_count),
    dealsWon: Number(r.deals_won),
    dealsWonValue: Number(r.deals_won_value) || 0,
    tasksCompleted: Number(r.tasks_completed),
  }));
}

export async function getDashboardStats(workspaceId: string) {
  // Compute all time boundaries once (avoid repeated Date.now() calls)
  const now = Date.now();
  const weekAgo = new Date(now - SEVEN_DAYS_MS);
  const fourteenDaysAgo = new Date(now - FOURTEEN_DAYS_MS);
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  // All 13 queries in a single Promise.all — no sequential waterfall
  const [
    contactsTotal,
    contactsThisWeek,
    dealsOpen,
    dealsPipeline,
    ticketsOpen,
    ticketsUrgent,
    tasksToday,
    tasksOverdue,
    recentActivities,
    myTasks,
    tasksCompletedThisWeek,
    callsThisWeek,
    rottingDeals,
  ] = await Promise.all([
    // Total contacts
    prisma.contact.count({ where: { workspaceId } }),

    // New contacts this week
    prisma.contact.count({
      where: { workspaceId, createdAt: { gte: weekAgo } },
    }),

    // Open deals aggregate (not WON or LOST)
    prisma.deal.aggregate({
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      _count: { id: true },
      _sum: { value: true },
    }),

    // Deals grouped by stage with values
    prisma.deal.groupBy({
      by: ["stage"],
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      _count: { id: true },
      _sum: { value: true },
    }),

    // Open tickets
    prisma.ticket.count({
      where: {
        workspaceId,
        status: { in: ["NEW", "OPEN", "PENDING"] },
      },
    }),

    // Urgent tickets
    prisma.ticket.count({
      where: {
        workspaceId,
        status: { in: ["NEW", "OPEN", "PENDING"] },
        priority: "URGENT",
      },
    }),

    // Tasks due today or overdue (not done)
    prisma.task.count({
      where: {
        workspaceId,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lte: todayEnd },
      },
    }),

    // Overdue tasks (strictly before today)
    prisma.task.count({
      where: {
        workspaceId,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lt: todayStart },
      },
    }),

    // Recent activities (last 10)
    prisma.activity.findMany({
      where: { workspaceId },
      include: {
        member: { include: { user: { select: { name: true } } } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Active tasks (not done, ordered by due date)
    prisma.task.findMany({
      where: {
        workspaceId,
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),

    // Tasks completed this week
    prisma.task.count({
      where: {
        workspaceId,
        status: "DONE",
        completedAt: { gte: weekAgo },
      },
    }),

    // Calls this week
    prisma.activity.count({
      where: {
        workspaceId,
        type: "CALL",
        createdAt: { gte: weekAgo },
      },
    }),

    // Deals with no CRM activity in 14+ days (rotting/at risk)
    prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        OR: [
          { lastActivityAt: { lt: fourteenDaysAgo } },
          { lastActivityAt: null, createdAt: { lt: fourteenDaysAgo } },
        ],
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ lastActivityAt: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
  ]);

  return {
    kpis: {
      contactsTotal,
      contactsThisWeek,
      dealsOpenCount: dealsOpen._count.id,
      totalPipelineValue: dealsOpen._sum.value?.toNumber() || 0,
      ticketsOpen,
      ticketsUrgent,
      tasksToday,
      tasksOverdue,
      tasksCompletedThisWeek,
      callsThisWeek,
    },
    pipeline: dealsPipeline.map((g) => ({
      stage: g.stage,
      count: g._count.id,
      value: g._sum.value?.toNumber() || 0,
    })),
    recentActivities,
    myTasks,
    rottingDeals: rottingDeals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value?.toNumber() || 0,
      contact: d.contact
        ? { id: d.contact.id, name: `${d.contact.firstName} ${d.contact.lastName}` }
        : null,
      owner: d.assignee?.user?.name || null,
      // Days since the last real CRM activity (or since creation if never had one)
      daysSinceUpdate: Math.floor(
        (Date.now() - (d.lastActivityAt ?? d.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      ),
    })),
  };
}
