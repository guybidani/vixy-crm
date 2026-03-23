import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import type { Prisma } from "@prisma/client";

export async function list(workspaceId: string, memberId: string, entity: string) {
  return prisma.savedView.findMany({
    where: { workspaceId, memberId, entity },
    orderBy: { createdAt: "asc" },
  });
}

export async function create(
  workspaceId: string,
  memberId: string,
  data: {
    entity: string;
    name: string;
    filters: Record<string, unknown>;
    isDefault?: boolean;
    sortBy?: string;
    sortDir?: string;
  },
) {
  // If setting as default, unset other defaults for this entity
  if (data.isDefault) {
    await prisma.savedView.updateMany({
      where: { workspaceId, memberId, entity: data.entity, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.savedView.create({
    data: {
      workspaceId,
      memberId,
      entity: data.entity,
      name: data.name.trim(),
      filters: data.filters as Prisma.InputJsonValue,
      isDefault: data.isDefault ?? false,
      sortBy: data.sortBy,
      sortDir: data.sortDir,
    },
  });
}

export async function update(
  workspaceId: string,
  memberId: string,
  id: string,
  data: {
    name?: string;
    filters?: Record<string, unknown>;
    isDefault?: boolean;
    sortBy?: string | null;
    sortDir?: string | null;
  },
) {
  const existing = await prisma.savedView.findFirst({
    where: { id, workspaceId, memberId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "View not found");

  // If setting as default, unset other defaults for this entity
  if (data.isDefault) {
    await prisma.savedView.updateMany({
      where: { workspaceId, memberId, entity: existing.entity, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.savedView.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.filters !== undefined && { filters: data.filters as Prisma.InputJsonValue }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.sortBy !== undefined && { sortBy: data.sortBy }),
      ...(data.sortDir !== undefined && { sortDir: data.sortDir }),
    },
  });
}

export async function remove(workspaceId: string, memberId: string, id: string) {
  const existing = await prisma.savedView.findFirst({
    where: { id, workspaceId, memberId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "View not found");

  return prisma.savedView.delete({ where: { id } });
}

export async function setDefault(workspaceId: string, memberId: string, id: string) {
  const existing = await prisma.savedView.findFirst({
    where: { id, workspaceId, memberId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "View not found");

  // Unset other defaults for this entity
  await prisma.savedView.updateMany({
    where: { workspaceId, memberId, entity: existing.entity, isDefault: true },
    data: { isDefault: false },
  });

  return prisma.savedView.update({
    where: { id },
    data: { isDefault: true },
  });
}
