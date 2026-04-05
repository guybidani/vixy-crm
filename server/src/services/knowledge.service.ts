import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function listCategories(workspaceId: string) {
  return prisma.kbCategory.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { order: "asc" },
  });
}

export async function listArticles(params: {
  workspaceId: string;
  categoryId?: string;
  status?: string;
  search?: string;
}) {
  const { workspaceId, categoryId, status, search } = params;

  const where: any = { workspaceId };
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.kbArticle.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getArticle(workspaceId: string, id: string) {
  // Verify article belongs to workspace first (cheap check, no join)
  const exists = await prisma.kbArticle.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!exists) throw new AppError(404, "NOT_FOUND", "Article not found");

  // Atomically increment viewCount and return the updated article in one query
  // — avoids the previous pattern where stale data was returned before the increment
  const article = await prisma.kbArticle.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return article;
}

export async function createCategory(
  workspaceId: string,
  data: { name: string; slug: string; order?: number; parentId?: string },
) {
  return prisma.kbCategory.create({
    data: {
      workspaceId,
      name: data.name,
      slug: data.slug,
      order: data.order || 0,
      parentId: data.parentId,
    },
  });
}

export async function createArticle(
  workspaceId: string,
  authorId: string,
  data: {
    title: string;
    slug: string;
    body: string;
    categoryId?: string;
    status?: string;
  },
) {
  return prisma.kbArticle.create({
    data: {
      workspaceId,
      authorId,
      title: data.title,
      slug: data.slug,
      body: data.body,
      categoryId: data.categoryId,
      status: data.status || "draft",
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
}

export async function updateArticle(
  workspaceId: string,
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    body: string;
    categoryId: string;
    status: string;
  }>,
) {
  const existing = await prisma.kbArticle.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Article not found");

  return prisma.kbArticle.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true } },
    },
  });
}

export async function deleteArticle(workspaceId: string, id: string) {
  const existing = await prisma.kbArticle.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Article not found");
  return prisma.kbArticle.delete({ where: { id } });
}

export async function voteArticle(
  workspaceId: string,
  id: string,
  helpful: boolean,
) {
  const existing = await prisma.kbArticle.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Article not found");

  return prisma.kbArticle.update({
    where: { id },
    data: helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
  });
}
