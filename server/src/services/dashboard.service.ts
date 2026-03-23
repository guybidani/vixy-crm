import { prisma } from "../db/client";

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

export async function getTeamPerformance(
  workspaceId: string,
): Promise<TeamMemberPerformance[]> {
  const weekStart = getThisWeekSunday();

  // Get all workspace members
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { name: true } } },
  });

  // Run all aggregations in parallel
  const results = await Promise.all(
    members.map(async (m) => {
      const [activitiesCount, callsCount, dealsWon, dealsWonAgg, tasksCompleted] =
        await Promise.all([
          // Total activities this week
          prisma.activity.count({
            where: { workspaceId, memberId: m.id, createdAt: { gte: weekStart } },
          }),
          // Calls this week
          prisma.activity.count({
            where: {
              workspaceId,
              memberId: m.id,
              type: "CALL",
              createdAt: { gte: weekStart },
            },
          }),
          // Deals closed-won this week (by assignee, stageChangedAt this week)
          prisma.deal.count({
            where: {
              workspaceId,
              assigneeId: m.id,
              stage: "CLOSED_WON",
              stageChangedAt: { gte: weekStart },
            },
          }),
          // Sum of won deal values
          prisma.deal.aggregate({
            where: {
              workspaceId,
              assigneeId: m.id,
              stage: "CLOSED_WON",
              stageChangedAt: { gte: weekStart },
            },
            _sum: { value: true },
          }),
          // Tasks completed this week
          prisma.task.count({
            where: {
              workspaceId,
              assigneeId: m.id,
              status: "DONE",
              completedAt: { gte: weekStart },
            },
          }),
        ]);

      return {
        memberId: m.id,
        name: m.user.name,
        activitiesCount,
        callsCount,
        dealsWon,
        dealsWonValue: dealsWonAgg._sum.value?.toNumber() || 0,
        tasksCompleted,
      };
    }),
  );

  // Sort by activitiesCount DESC
  results.sort((a, b) => b.activitiesCount - a.activitiesCount);

  return results;
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
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [tasksCompletedThisWeek, rottingDeals] = await Promise.all([
    prisma.task.count({
      where: {
        workspaceId,
        status: "DONE",
        completedAt: { gte: weekAgo },
      },
    }),
    // Deals with no activity in 14+ days (rotting/at risk)
    prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
        updatedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        assignee: { include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "asc" },
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
      daysSinceUpdate: Math.floor(
        (Date.now() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    })),
  };
}
