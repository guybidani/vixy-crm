import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function listSlaPolicies(workspaceId: string) {
  return prisma.slaPolicy.findMany({
    where: { workspaceId },
    include: { _count: { select: { tickets: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function createSlaPolicy(
  workspaceId: string,
  data: {
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
    businessHoursOnly?: boolean;
    isDefault?: boolean;
  },
) {
  // Wrap unset-old + create-new in a transaction to prevent a crash from
  // leaving the workspace with zero default SLA policies.
  if (data.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.slaPolicy.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.slaPolicy.create({
        data: {
          workspaceId,
          name: data.name,
          firstResponseMinutes: data.firstResponseMinutes,
          resolutionMinutes: data.resolutionMinutes,
          businessHoursOnly: data.businessHoursOnly ?? true,
          isDefault: true,
        },
      });
    });
  }

  return prisma.slaPolicy.create({
    data: {
      workspaceId,
      name: data.name,
      firstResponseMinutes: data.firstResponseMinutes,
      resolutionMinutes: data.resolutionMinutes,
      businessHoursOnly: data.businessHoursOnly ?? true,
      isDefault: false,
    },
  });
}

export async function updateSlaPolicy(
  workspaceId: string,
  id: string,
  data: Partial<{
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
    businessHoursOnly: boolean;
    isDefault: boolean;
  }>,
) {
  const existing = await prisma.slaPolicy.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "SLA policy not found");

  // Wrap unset-old + set-new in a transaction to prevent partial default state
  if (data.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.slaPolicy.updateMany({
        where: { workspaceId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
      return tx.slaPolicy.update({
        where: { id },
        data,
      });
    });
  }

  return prisma.slaPolicy.update({
    where: { id },
    data,
  });
}

export async function deleteSlaPolicy(workspaceId: string, id: string) {
  // Fetch policy and ticket usage count in parallel — they are independent queries.
  // Scope ticket count to workspace so we don't leak cross-workspace data into
  // the error message.
  const [existing, ticketCount] = await Promise.all([
    prisma.slaPolicy.findFirst({ where: { id, workspaceId } }),
    prisma.ticket.count({ where: { workspaceId, slaPolicyId: id } }),
  ]);

  if (!existing) throw new AppError(404, "NOT_FOUND", "SLA policy not found");

  if (ticketCount > 0) {
    throw new AppError(
      400,
      "IN_USE",
      `Cannot delete - ${ticketCount} tickets use this policy`,
    );
  }

  // Use deleteMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the delete level, not just the existence check above.
  const result = await prisma.slaPolicy.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "SLA policy not found");
  return { deleted: true };
}
