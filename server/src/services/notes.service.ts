import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { dispatchMentionNotifications } from "./mentions.service";

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
  // IDOR protection: verify the target entity lives in this workspace before
  // attaching a note to it. Without this check, any authenticated member can
  // create notes on arbitrary entityIds (cross-workspace or non-existent) —
  // the Note table has no FK to the target entity.
  let entityExists = false;
  if (data.entityType === "contact") {
    entityExists = !!(await prisma.contact.findFirst({
      where: { id: data.entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (data.entityType === "deal") {
    entityExists = !!(await prisma.deal.findFirst({
      where: { id: data.entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (data.entityType === "company") {
    entityExists = !!(await prisma.company.findFirst({
      where: { id: data.entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (data.entityType === "task") {
    entityExists = !!(await prisma.task.findFirst({
      where: { id: data.entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (data.entityType === "ticket") {
    // Ticket has no soft-delete column.
    entityExists = !!(await prisma.ticket.findFirst({
      where: { id: data.entityId, workspaceId },
      select: { id: true },
    }));
  } else {
    throw new AppError(400, "VALIDATION_ERROR", `Unsupported entityType: ${data.entityType}`);
  }
  if (!entityExists) {
    throw new AppError(403, "FORBIDDEN", `Entity ${data.entityId} not found in workspace`);
  }

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

  // Fire-and-forget: parse @mentions out of the note and create MENTION
  // notifications for each tagged workspace member. Never blocks the response
  // or bubbles errors — the note itself has already been persisted.
  void dispatchMentionNotifications({
    workspaceId,
    authorMemberId: authorId,
    entityType: data.entityType,
    entityId: data.entityId,
    content: data.content,
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

  const updated = await prisma.note.findFirstOrThrow({
    where: { id: noteId, workspaceId },
    include: {
      author: { include: { user: { select: { name: true } } } },
    },
  });

  // When content changes, diff the mentions so we only ping *newly added*
  // members — editing a typo shouldn't re-notify everyone who was already
  // mentioned in the original version.
  if (data.content !== undefined && existing.content !== data.content) {
    const { parseMentions } = await import("../utils/mentions.util");
    const oldIds = new Set(parseMentions(existing.content).map((m) => m.memberId));
    const newMentions = parseMentions(data.content).filter(
      (m) => !oldIds.has(m.memberId),
    );
    if (newMentions.length > 0) {
      // Rebuild a content string containing just the new mentions so
      // dispatchMentionNotifications' parseMentions finds exactly them.
      const syntheticContent = newMentions
        .map((m) => `@[${m.name}](${m.memberId})`)
        .join(" ") +
        " " + data.content;
      void dispatchMentionNotifications({
        workspaceId,
        authorMemberId: memberId,
        entityType: updated.entityType,
        entityId: updated.entityId,
        content: syntheticContent,
      });
    }
  }

  return updated;
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
