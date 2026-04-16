import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

interface ListParams {
  workspaceId: string;
  entityType: string;
  entityId: string;
  page?: number;
  limit?: number;
}

export async function list(params: ListParams) {
  const { workspaceId, entityType, entityId, page: rawPage = 1, limit: rawLimit = 50 } = params;
  const page = Math.max(1, rawPage);
  const limit = Math.min(Math.max(1, rawLimit), 100);

  const where = { workspaceId, entityType, entityId };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        author: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.note.count({ where }),
  ]);

  return {
    data: notes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function create(
  workspaceId: string,
  authorId: string,
  data: { entityType: string; entityId: string; content: string },
) {
  const note = await prisma.note.create({
    data: {
      workspaceId,
      authorId,
      entityType: data.entityType,
      entityId: data.entityId,
      content: data.content,
    },
    include: {
      author: { include: { user: { select: { name: true } } } },
    },
  });

  return note;
}

export async function update(
  workspaceId: string,
  memberId: string,
  noteId: string,
  data: { content?: string; isPinned?: boolean },
) {
  const existing = await prisma.note.findFirst({
    where: { id: noteId, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Note not found");

  // Only author can edit content; anyone in workspace can pin/unpin
  if (data.content !== undefined && existing.authorId !== memberId) {
    throw new AppError(403, "FORBIDDEN", "Not the author");
  }

  const updateData: Record<string, unknown> = {};
  if (data.content !== undefined) updateData.content = data.content;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

  await prisma.note.updateMany({
    where: { id: noteId, workspaceId },
    data: updateData,
  });

  return prisma.note.findFirstOrThrow({
    where: { id: noteId, workspaceId },
    include: {
      author: { include: { user: { select: { name: true } } } },
    },
  });
}

export async function remove(
  workspaceId: string,
  memberId: string,
  noteId: string,
) {
  const result = await prisma.note.deleteMany({
    where: { id: noteId, workspaceId, authorId: memberId },
  });
  if (result.count === 0) {
    const exists = await prisma.note.findFirst({
      where: { id: noteId, workspaceId },
      select: { id: true },
    });
    if (exists) throw new AppError(403, "FORBIDDEN", "Not the author");
    throw new AppError(404, "NOT_FOUND", "Note not found");
  }
  return { deleted: true };
}
