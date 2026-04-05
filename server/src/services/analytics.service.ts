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

interface WeeklyCountRow {
  week_start: Date;
  count: bigint;
}

export async function getContactGrowth(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  // Group by ISO week (Monday start) in SQL — avoids fetching all rows into memory
  const rows = await prisma.$queryRaw<WeeklyCountRow[]>`
    SELECT date_trunc('week', created_at)::date AS week_start, COUNT(*) AS count
    FROM contacts
    WHERE workspace_id = ${workspaceId}
      AND created_at >= ${dateFrom}
      AND created_at <= ${dateTo}
    GROUP BY week_start
    ORDER BY week_start ASC
  `;

  return rows.map((r) => ({
    weekStart: r.week_start.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}

export async function getDealGrowth(
  workspaceId: string,
  dateFrom: Date,
  dateTo: Date,
) {
  // Group by ISO week (Monday start) in SQL — avoids fetching all rows into memory
  const rows = await prisma.$queryRaw<WeeklyCountRow[]>`
    SELECT date_trunc('week', created_at)::date AS week_start, COUNT(*) AS count
    FROM deals
    WHERE workspace_id = ${workspaceId}
      AND created_at >= ${dateFrom}
      AND created_at <= ${dateTo}
    GROUP BY week_start
    ORDER BY week_start ASC
  `;

  return rows.map((r) => ({
    weekStart: r.week_start.toISOString().slice(0, 10),
    count: Number(r.count),
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

  // Fetch member names (scoped to workspace for defense-in-depth)
  const memberIds = grouped.map((g) => g.memberId);
  const members = await prisma.workspaceMember.findMany({
    where: { id: { in: memberIds }, workspaceId },
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
