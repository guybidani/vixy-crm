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
  // Wrap unset-old + create-new in a transaction so a crash between the two
  // never leaves the entity with zero default views.
  if (data.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.savedView.updateMany({
        where: { workspaceId, memberId, entity: data.entity, isDefault: true },
        data: { isDefault: false },
      });
      return tx.savedView.create({
        data: {
          workspaceId,
          memberId,
          entity: data.entity,
          name: data.name.trim(),
          filters: data.filters as Prisma.InputJsonValue,
          isDefault: true,
          sortBy: data.sortBy,
          sortDir: data.sortDir,
        },
      });
    });
  }

  return prisma.savedView.create({
    data: {
      workspaceId,
      memberId,
      entity: data.entity,
      name: data.name.trim(),
      filters: data.filters as Prisma.InputJsonValue,
      isDefault: false,
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

  const updatePayload: Prisma.SavedViewUpdateInput = {
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.filters !== undefined && { filters: data.filters as Prisma.InputJsonValue }),
    ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    ...(data.sortBy !== undefined && { sortBy: data.sortBy }),
    ...(data.sortDir !== undefined && { sortDir: data.sortDir }),
  };

  // Wrap unset-old + set-new in a transaction to prevent partial default state
  if (data.isDefault) {
    return prisma.$transaction(async (tx) => {
      await tx.savedView.updateMany({
        where: { workspaceId, memberId, entity: existing.entity, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
      return tx.savedView.update({
        where: { id },
        data: updatePayload,
      });
    });
  }

  // Use updateMany with workspace+member scope for defense-in-depth (prevents
  // a TOCTOU gap between the findFirst check and the actual write).
  const result = await prisma.savedView.updateMany({
    where: { id, workspaceId, memberId },
    data: updatePayload as any,
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "View not found");
  }
  return prisma.savedView.findFirstOrThrow({ where: { id, workspaceId, memberId } });
}

export async function remove(workspaceId: string, memberId: string, id: string) {
  // Use deleteMany with workspace+member scope in a single round-trip instead
  // of findFirst + delete (TOCTOU race). Defense-in-depth: scope enforced at
  // the delete level, not just the check.
  const result = await prisma.savedView.deleteMany({
    where: { id, workspaceId, memberId },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "View not found");
  }
  return { deleted: true };
}

export async function setDefault(workspaceId: string, memberId: string, id: string) {
  const existing = await prisma.savedView.findFirst({
    where: { id, workspaceId, memberId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "View not found");

  // Wrap unset-old + set-new in a transaction to prevent partial default state
  return prisma.$transaction(async (tx) => {
    await tx.savedView.updateMany({
      where: { workspaceId, memberId, entity: existing.entity, isDefault: true },
      data: { isDefault: false },
    });
    return tx.savedView.update({
      where: { id },
      data: { isDefault: true },
    });
  });
}
