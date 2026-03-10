import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function listSlaPolicies(workspaceId: string) {
  return prisma.slaPolicy.findMany({
    where: { workspaceId },
    include: { _count: { select: { tickets: true } } },
    orderBy: { createdAt: "asc" },
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
  // If marking as default, unset other defaults
  if (data.isDefault) {
    await prisma.slaPolicy.updateMany({
      where: { workspaceId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.slaPolicy.create({
    data: {
      workspaceId,
      name: data.name,
      firstResponseMinutes: data.firstResponseMinutes,
      resolutionMinutes: data.resolutionMinutes,
      businessHoursOnly: data.businessHoursOnly ?? true,
      isDefault: data.isDefault ?? false,
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

  if (data.isDefault) {
    await prisma.slaPolicy.updateMany({
      where: { workspaceId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.slaPolicy.update({
    where: { id },
    data,
  });
}

export async function deleteSlaPolicy(workspaceId: string, id: string) {
  const existing = await prisma.slaPolicy.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "SLA policy not found");

  // Check if any tickets use this policy
  const ticketCount = await prisma.ticket.count({
    where: { slaPolicyId: id },
  });
  if (ticketCount > 0) {
    throw new AppError(
      400,
      "IN_USE",
      `Cannot delete - ${ticketCount} tickets use this policy`,
    );
  }

  return prisma.slaPolicy.delete({ where: { id } });
}
