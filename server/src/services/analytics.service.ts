import { prisma } from "../db/client";

export async function getActivityBreakdown(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const grouped = await prisma.activity.groupBy({
    by: ["type"],
    where: {
      workspaceId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    _count: { id: true },
  });

  return grouped.map((g) => ({
    type: g.type,
    count: g._count.id,
  }));
}

export async function getDealConversionFunnel(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const grouped = await prisma.deal.groupBy({
    by: ["stage"],
    where: {
      workspaceId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    _count: { id: true },
    _sum: { value: true },
  });

  return grouped.map((g) => ({
    stage: g.stage,
    count: g._count.id,
    value: g._sum.value?.toNumber() || 0,
  }));
}

export async function getTaskCompletionRate(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const [totalCreated, totalCompleted] = await Promise.all([
    prisma.task.count({
      where: {
        workspaceId,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    }),
    prisma.task.count({
      where: {
        workspaceId,
        createdAt: { gte: dateFrom, lte: dateTo },
        status: "DONE",
      },
    }),
  ]);

  const rate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  return {
    totalCreated,
    totalCompleted,
    pending: totalCreated - totalCompleted,
    completionRate: rate,
  };
}

export async function getContactGrowth(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  // Raw query to group contacts by week
  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by week (ISO week start = Monday)
  const weekMap = new Map<string, number>();
  for (const c of contacts) {
    const d = new Date(c.createdAt);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) || 0) + 1);
  }

  return Array.from(weekMap.entries()).map(([weekStart, count]) => ({
    weekStart,
    count,
  }));
}

export async function getDealGrowth(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const deals = await prisma.deal.findMany({
    where: {
      workspaceId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by week (ISO week start = Monday)
  const weekMap = new Map<string, number>();
  for (const d of deals) {
    const date = new Date(d.createdAt);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) || 0) + 1);
  }

  return Array.from(weekMap.entries()).map(([weekStart, count]) => ({
    weekStart,
    count,
  }));
}

export async function getLeadSources(workspaceId: string) {
  const grouped = await prisma.contact.groupBy({
    by: ["source"],
    where: { workspaceId },
    _count: { id: true },
  });

  return grouped.map((g) => ({
    source: g.source || "OTHER",
    count: g._count.id,
  }));
}

export async function getTopPerformers(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  const grouped = await prisma.activity.groupBy({
    by: ["memberId"],
    where: {
      workspaceId,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  // Fetch member names
  const memberIds = grouped.map((g) => g.memberId);
  const members = await prisma.workspaceMember.findMany({
    where: { id: { in: memberIds } },
    include: { user: { select: { name: true, avatarUrl: true } } },
  });

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return grouped.map((g) => {
    const member = memberMap.get(g.memberId);
    return {
      memberId: g.memberId,
      name: member?.user?.name || "לא ידוע",
      avatarUrl: member?.user?.avatarUrl || null,
      activitiesCount: g._count.id,
    };
  });
}
