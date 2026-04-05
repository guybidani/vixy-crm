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
    take: 200,
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
  // Use updateMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the mutation level, not just an existence check (prevents
  // TOCTOU race and cross-workspace writes).
  const result = await prisma.cannedResponse.updateMany({
    where: { id, workspaceId },
    data,
  });
  if (result.count === 0)
    throw new AppError(404, "NOT_FOUND", "Canned response not found");

  return prisma.cannedResponse.findUnique({ where: { id } });
}

export async function deleteCannedResponse(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the delete level, not just an existence check.
  const result = await prisma.cannedResponse.deleteMany({
    where: { id, workspaceId },
  });
  if (result.count === 0)
    throw new AppError(404, "NOT_FOUND", "Canned response not found");
  return { deleted: true };
}
