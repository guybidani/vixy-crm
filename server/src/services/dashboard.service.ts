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

  const rows = await prisma.$queryRaw<TeamPerformanceRow[]>`
    SELECT
      wm.id AS member_id,
      u.name,
      COALESCE((
        SELECT COUNT(*) FROM activities a
        WHERE a.workspace_id = wm.workspace_id AND a.member_id = wm.id AND a.created_at >= ${weekStart}
      ), 0) AS activities_count,
      COALESCE((
        SELECT COUNT(*) FROM activities a
        WHERE a.workspace_id = wm.workspace_id AND a.member_id = wm.id AND a.type = 'CALL' AND a.created_at >= ${weekStart}
      ), 0) AS calls_count,
      COALESCE((
        SELECT COUNT(*) FROM deals d
        WHERE d.workspace_id = wm.workspace_id AND d.assignee_id = wm.id AND d.stage = 'CLOSED_WON' AND d.stage_changed_at >= ${weekStart}
      ), 0) AS deals_won,
      COALESCE((
        SELECT SUM(d.value) FROM deals d
        WHERE d.workspace_id = wm.workspace_id AND d.assignee_id = wm.id AND d.stage = 'CLOSED_WON' AND d.stage_changed_at >= ${weekStart}
      ), 0) AS deals_won_value,
      COALESCE((
        SELECT COUNT(*) FROM tasks t
        WHERE t.workspace_id = wm.workspace_id AND t.assignee_id = wm.id AND t.status = 'DONE' AND t.completed_at >= ${weekStart}
      ), 0) AS tasks_completed
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
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
  ] = await Promise.all([
    // Total contacts
    prisma.contact.count({ where: { workspaceId } }),

    // New contacts this week
    prisma.contact.count({
      where: {
        workspaceId,
        createdAt: {
          gte: new Date(Date.now() - SEVEN_DAYS_MS),
        },
      },
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
        dueDate: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
    }),

    // Overdue tasks
    prisma.task.count({
      where: {
        workspaceId,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
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
  ]);

  // Completed tasks this week
  const weekAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const [tasksCompletedThisWeek, rottingDeals] = await Promise.all([
    prisma.task.count({
      where: {
        workspaceId,
        status: "DONE",
        completedAt: { gte: weekAgo },
      },
    }),
    // Deals with no CRM activity in 14+ days (rotting/at risk)
    // Use lastActivityAt (stamped when real activities like calls/notes happen),
    // falling back to createdAt for deals that have never had an activity logged.
    prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        OR: [
          {
            lastActivityAt: { lt: new Date(Date.now() - FOURTEEN_DAYS_MS) },
          },
          {
            lastActivityAt: null,
            createdAt: { lt: new Date(Date.now() - FOURTEEN_DAYS_MS) },
          },
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
