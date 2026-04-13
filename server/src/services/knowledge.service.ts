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
  page?: number;
  limit?: number;
}) {
  const { workspaceId, categoryId, status, search, page: rawPage = 1, limit: rawLimit = 50 } = params;
  // Clamp page/limit to valid positive ranges — negative page causes negative
  // skip (Prisma error), and limit<=0 silently returns empty results.
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 100);

  const where: any = { workspaceId };
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (search) {
    // Sanitize LIKE wildcards so user input like "%" or "_" doesn't match
    // everything.  Prisma's `contains` maps to SQL LIKE '%…%'.
    const safeSearch = search.replace(/[%_]/g, "\\$&");
    where.OR = [
      { title: { contains: safeSearch, mode: "insensitive" } },
      { body: { contains: safeSearch, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.kbArticle.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kbArticle.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
  // Verify parentId belongs to this workspace (prevent cross-workspace BOLA)
  if (data.parentId) {
    const parent = await prisma.kbCategory.findFirst({
      where: { id: data.parentId, workspaceId },
      select: { id: true },
    });
    if (!parent) throw new AppError(400, "INVALID_REFERENCE", "Parent category not found in workspace");
  }

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
  // Verify categoryId belongs to this workspace (prevent cross-workspace BOLA)
  if (data.categoryId) {
    const category = await prisma.kbCategory.findFirst({
      where: { id: data.categoryId, workspaceId },
      select: { id: true },
    });
    if (!category) throw new AppError(400, "INVALID_REFERENCE", "Category not found in workspace");
  }

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
  // Verify article exists and categoryId belongs to workspace in parallel
  const [existing, categoryRef] = await Promise.all([
    prisma.kbArticle.findFirst({
      where: { id, workspaceId },
    }),
    data.categoryId
      ? prisma.kbCategory.findFirst({ where: { id: data.categoryId, workspaceId }, select: { id: true } })
      : null,
  ]);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Article not found");
  if (data.categoryId && !categoryRef)
    throw new AppError(400, "INVALID_REFERENCE", "Category not found in workspace");

  // Build updateData from explicit fields instead of passing raw data object.
  // Blind spread risks writing unexpected fields to Prisma (same pattern
  // already fixed in deals, tickets, tasks, contacts, and companies).
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.status !== undefined) updateData.status = data.status;

  // Use updateMany with workspaceId for defense-in-depth (prevents a TOCTOU
  // gap between the findFirst check and the actual write), then re-fetch.
  const result = await prisma.kbArticle.updateMany({
    where: { id, workspaceId },
    data: updateData,
  });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Article not found");

  return prisma.kbArticle.findFirstOrThrow({
    where: { id, workspaceId },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
}

export async function deleteArticle(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId filter in a single round-trip instead of
  // find + delete (two round-trips). This also provides defense-in-depth — the
  // workspace scope is enforced at the delete level, not just the check.
  const result = await prisma.kbArticle.deleteMany({
    where: { id, workspaceId },
  });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Article not found");
  return { deleted: true };
}

export async function voteArticle(
  workspaceId: string,
  id: string,
  helpful: boolean,
) {
  // Use updateMany with workspaceId scope for defense-in-depth — prevents a
  // TOCTOU gap between the existence check and the vote write.  The previous
  // pattern did findFirst(workspaceId) then update(id only).
  const result = await prisma.kbArticle.updateMany({
    where: { id, workspaceId },
    data: helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
  });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Article not found");

  return prisma.kbArticle.findFirstOrThrow({
    where: { id, workspaceId },
  });
}
