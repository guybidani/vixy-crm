import { prisma } from "../db/client";

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
    },
    pipeline: dealsPipeline.map((g) => ({
      stage: g.stage,
      count: g._count.id,
      value: g._sum.value?.toNumber() || 0,
    })),
    recentActivities,
    myTasks,
  };
}
