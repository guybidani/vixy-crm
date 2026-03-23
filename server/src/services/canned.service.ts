import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function listCannedResponses(
  workspaceId: string,
  category?: string,
) {
  const where: any = { workspaceId };
  if (category) where.category = category;

  return prisma.cannedResponse.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function createCannedResponse(
  workspaceId: string,
  data: { name: string; body: string; category?: string; createdById: string },
) {
  return prisma.cannedResponse.create({
    data: {
      workspaceId,
      name: data.name,
      body: data.body,
      category: data.category,
      createdById: data.createdById,
    },
  });
}

export async function updateCannedResponse(
  workspaceId: string,
  id: string,
  data: Partial<{ name: string; body: string; category: string }>,
) {
  const existing = await prisma.cannedResponse.findFirst({
    where: { id, workspaceId },
  });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Canned response not found");

  return prisma.cannedResponse.update({
    where: { id },
    data,
  });
}

export async function deleteCannedResponse(workspaceId: string, id: string) {
  const existing = await prisma.cannedResponse.findFirst({
    where: { id, workspaceId },
  });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Canned response not found");

  return prisma.cannedResponse.delete({ where: { id } });
}
