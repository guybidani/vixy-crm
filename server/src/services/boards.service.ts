import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import { BOARD_TEMPLATES } from "./board-templates";
import type { BoardPermission } from "@prisma/client";

// ── List boards (lightweight) ──────────────────────────────────────
export async function list(workspaceId: string) {
  const boards = await prisma.board.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { items: true, columns: true, groups: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    color: b.color,
    templateKey: b.templateKey,
    isPrivate: b.isPrivate,
    itemCount: b._count.items,
    columnCount: b._count.columns,
    groupCount: b._count.groups,
    createdAt: b.createdAt,
  }));
}

// ── Get full board ─────────────────────────────────────────────────
export async function getById(workspaceId: string, id: string) {
  const board = await prisma.board.findFirst({
    where: { id, workspaceId },
    include: {
      columns: { orderBy: { order: "asc" } },
      groups: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              values: {
                include: {
                  column: { select: { id: true, key: true, type: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!board) {
    throw new AppError(404, "NOT_FOUND", "Board not found");
  }

  return board;
}

// ── Create board (from template or blank) ──────────────────────────
export async function create(
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    templateKey?: string;
    description?: string;
    icon?: string;
    color?: string;
  },
) {
  const template = data.templateKey
    ? BOARD_TEMPLATES[data.templateKey]
    : BOARD_TEMPLATES.blank;

  // Find the workspace member record for the creator
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });

  const board = await prisma.board.create({
    data: {
      workspaceId,
      createdById: userId,
      name: data.name,
      description: data.description,
      icon: data.icon || template?.icon || "LayoutGrid",
      color: data.color || template?.color || "#579BFC",
      templateKey: data.templateKey,
      columns: {
        create: (
          template?.columns || [{ key: "name", label: "שם", type: "TEXT" }]
        ).map((col, i) => ({
          key: col.key,
          label: col.label,
          type: col.type as any,
          width: col.width,
          order: i,
          options: col.options || undefined,
        })),
      },
      groups: {
        create: [
          {
            name: template?.defaultGroupName || "קבוצה חדשה",
            color: template?.color || "#579BFC",
            order: 0,
          },
        ],
      },
      // Auto-grant ADMIN to the board creator
      ...(member
        ? {
            access: {
              create: {
                memberId: member.id,
                permission: "ADMIN",
                grantedBy: member.id,
              },
            },
          }
        : {}),
    },
    include: {
      columns: { orderBy: { order: "asc" } },
      groups: { orderBy: { order: "asc" } },
    },
  });

  return board;
}

// ── Update board settings ──────────────────────────────────────────
export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    isPrivate: boolean;
    automations: any;
  }>,
) {
  // Use updateMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the mutation level, not just an existence check (prevents TOCTOU).
  const result = await prisma.board.updateMany({
    where: { id, workspaceId },
    data,
  });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.board.findUnique({ where: { id } });
}

// ── Delete board ───────────────────────────────────────────────────
export async function remove(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the delete level, not just an existence check (prevents TOCTOU).
  const result = await prisma.board.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) throw new AppError(404, "NOT_FOUND", "Board not found");
  return { deleted: true };
}

// ══════════════════════════════════════════════════════════════════
// COLUMNS
// ══════════════════════════════════════════════════════════════════

export async function addColumn(
  workspaceId: string,
  boardId: string,
  data: {
    key: string;
    label: string;
    type: string;
    width?: string;
    options?: any;
  },
) {
  // Verify board ownership and compute max order in parallel
  const [board, maxOrder] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardColumn.aggregate({ where: { boardId }, _max: { order: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardColumn.create({
    data: {
      boardId,
      key: data.key,
      label: data.label,
      type: data.type as any,
      width: data.width,
      order: (maxOrder._max.order ?? -1) + 1,
      options: data.options || undefined,
    },
  });
}

export async function updateColumn(
  workspaceId: string,
  boardId: string,
  columnId: string,
  data: Partial<{
    label: string;
    width: string;
    order: number;
    options: any;
  }>,
) {
  // Verify board ownership and column belongs to board in parallel
  const [board, col] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardColumn.findFirst({ where: { id: columnId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!col) throw new AppError(404, "NOT_FOUND", "Column not found");

  return prisma.boardColumn.update({
    where: { id: columnId },
    data,
  });
}

export async function deleteColumn(
  workspaceId: string,
  boardId: string,
  columnId: string,
) {
  // Verify board ownership and column belongs to board in parallel
  const [board, col] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardColumn.findFirst({ where: { id: columnId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!col) throw new AppError(404, "NOT_FOUND", "Column not found");

  return prisma.boardColumn.delete({ where: { id: columnId } });
}

// ══════════════════════════════════════════════════════════════════
// GROUPS
// ══════════════════════════════════════════════════════════════════

export async function addGroup(
  workspaceId: string,
  boardId: string,
  data: { name: string; color?: string },
) {
  // Verify board ownership and compute max order in parallel
  const [board, maxOrder] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardGroup.aggregate({ where: { boardId }, _max: { order: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardGroup.create({
    data: {
      boardId,
      name: data.name,
      color: data.color || "#579BFC",
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function updateGroup(
  workspaceId: string,
  boardId: string,
  groupId: string,
  data: Partial<{
    name: string;
    color: string;
    order: number;
    collapsed: boolean;
  }>,
) {
  // Verify board ownership and group belongs to board in parallel
  const [board, group] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardGroup.findFirst({ where: { id: groupId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!group) throw new AppError(404, "NOT_FOUND", "Group not found");

  return prisma.boardGroup.update({
    where: { id: groupId },
    data,
  });
}

export async function deleteGroup(
  workspaceId: string,
  boardId: string,
  groupId: string,
) {
  // Verify board ownership and group belongs to board in parallel
  const [board, group] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardGroup.findFirst({ where: { id: groupId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!group) throw new AppError(404, "NOT_FOUND", "Group not found");

  return prisma.boardGroup.delete({ where: { id: groupId } });
}

// ══════════════════════════════════════════════════════════════════
// ITEMS
// ══════════════════════════════════════════════════════════════════

export async function createBoardItemActivity(data: {
  itemId: string;
  actorId?: string;
  actorName?: string;
  type: string;
  columnKey?: string;
  columnLabel?: string;
  oldValue?: string;
  newValue?: string;
}) {
  return prisma.boardItemActivity.create({ data });
}

export async function addItem(
  workspaceId: string,
  boardId: string,
  groupId: string,
  data: { name: string },
  actorId?: string,
  actorName?: string,
) {
  // Verify board ownership and compute max order in parallel
  const [board, maxOrder] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.aggregate({ where: { groupId }, _max: { order: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const item = await prisma.boardItem.create({
    data: {
      boardId,
      groupId,
      name: data.name,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      values: {
        include: {
          column: { select: { id: true, key: true, type: true } },
        },
      },
    },
  });

  await createBoardItemActivity({
    itemId: item.id,
    actorId,
    actorName,
    type: "item_created",
    newValue: data.name,
  });

  return item;
}

export async function updateItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
  data: Partial<{ name: string; groupId: string; order: number }>,
  actorId?: string,
  actorName?: string,
) {
  // Validate board ownership and fetch existing item in parallel
  const [board, existing] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const updated = await prisma.boardItem.update({
    where: { id: itemId },
    data: { ...data, lastActivityAt: new Date() },
    include: {
      values: {
        include: {
          column: { select: { id: true, key: true, type: true } },
        },
      },
    },
  });

  if (existing) {
    if (data.name && data.name !== existing.name) {
      await createBoardItemActivity({
        itemId,
        actorId,
        actorName,
        type: "name_changed",
        oldValue: existing.name,
        newValue: data.name,
      });
    }
    if (data.groupId && data.groupId !== existing.groupId) {
      await createBoardItemActivity({
        itemId,
        actorId,
        actorName,
        type: "item_moved",
        oldValue: existing.groupId,
        newValue: data.groupId,
      });
    }
  }

  return updated;
}

export async function deleteItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
) {
  // Verify board ownership and item belongs to board in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItem.delete({ where: { id: itemId } });
}

// ══════════════════════════════════════════════════════════════════
// ITEM VALUES (batch upsert)
// ══════════════════════════════════════════════════════════════════

export async function updateItemValues(
  workspaceId: string,
  boardId: string,
  itemId: string,
  values: Array<{
    columnId: string;
    textValue?: string | null;
    numberValue?: number | null;
    dateValue?: string | null;
    jsonValue?: any;
  }>,
  actorId?: string,
  actorName?: string,
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  // Fetch existing values + column info for activity logging
  const existingValues = await prisma.boardItemValue.findMany({
    where: { itemId, columnId: { in: values.map((v) => v.columnId) } },
    include: { column: { select: { key: true, label: true } } },
  });
  const existingMap = new Map(existingValues.map((ev) => [ev.columnId, ev]));

  // Fetch column info for columns that don't have existing values yet
  const missingColumnIds = values
    .map((v) => v.columnId)
    .filter((id) => !existingMap.has(id));
  const newColumns =
    missingColumnIds.length > 0
      ? await prisma.boardColumn.findMany({
          where: { id: { in: missingColumnIds } },
          select: { id: true, key: true, label: true },
        })
      : [];
  const newColumnMap = new Map(newColumns.map((c) => [c.id, c]));

  // Stamp lastActivityAt and upsert values in parallel
  const [results] = await Promise.all([
    Promise.all(values.map((v) =>
      prisma.boardItemValue.upsert({
        where: {
          itemId_columnId: { itemId, columnId: v.columnId },
        },
        create: {
          itemId,
          columnId: v.columnId,
          textValue: v.textValue,
          numberValue: v.numberValue,
          dateValue: v.dateValue ? new Date(v.dateValue) : undefined,
          jsonValue: v.jsonValue,
        },
        update: {
          textValue: v.textValue,
          numberValue: v.numberValue,
          dateValue: v.dateValue ? new Date(v.dateValue) : null,
          jsonValue: v.jsonValue,
        },
      }),
    )),
    prisma.boardItem.update({
      where: { id: itemId },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  // Batch-log activities for changed values — single createMany instead of N
  // sequential creates, reducing round-trips from O(N) to 1.
  const getDisplayValue = (val: (typeof existingValues)[number] | undefined) => {
    if (!val) return undefined;
    if (val.textValue != null) return val.textValue;
    if (val.numberValue != null) return String(val.numberValue);
    if (val.dateValue != null) return val.dateValue.toISOString();
    if (val.jsonValue != null) return JSON.stringify(val.jsonValue);
    return undefined;
  };

  const activityRows: Array<{
    itemId: string;
    actorId?: string;
    actorName?: string;
    type: string;
    columnKey?: string;
    columnLabel?: string;
    oldValue?: string;
    newValue?: string;
  }> = [];

  for (const v of values) {
    const existing = existingMap.get(v.columnId);
    const col = existing?.column ?? newColumnMap.get(v.columnId);

    const newDisplay =
      v.textValue != null
        ? v.textValue
        : v.numberValue != null
          ? String(v.numberValue)
          : v.dateValue != null
            ? v.dateValue
            : v.jsonValue != null
              ? JSON.stringify(v.jsonValue)
              : undefined;

    const oldDisplay = getDisplayValue(existing);

    if (oldDisplay !== newDisplay) {
      activityRows.push({
        itemId,
        actorId,
        actorName,
        type: "value_changed",
        columnKey: col?.key,
        columnLabel: col?.label,
        oldValue: oldDisplay,
        newValue: newDisplay,
      });
    }
  }

  if (activityRows.length > 0) {
    await prisma.boardItemActivity.createMany({ data: activityRows });
  }


  return results;
}

// ══════════════════════════════════════════════════════════════════
// BOARD ACCESS / PERMISSIONS
// ══════════════════════════════════════════════════════════════════

/** Get a member's permission level on a board, or null if no access record. */
export async function getBoardAccess(boardId: string, memberId: string) {
  const access = await prisma.boardAccess.findUnique({
    where: { boardId_memberId: { boardId, memberId } },
  });
  return access?.permission ?? null;
}

/**
 * List boards visible to a member:
 * - Board is NOT private (isPrivate=false), OR
 * - Member has a BoardAccess record, OR
 * - Member role is OWNER (sees everything)
 */
export async function listBoardsForMember(
  workspaceId: string,
  memberId: string,
  memberRole: string,
) {
  // OWNERs see all boards
  if (memberRole === "OWNER") {
    return list(workspaceId);
  }

  const boards = await prisma.board.findMany({
    where: {
      workspaceId,
      OR: [
        { isPrivate: false },
        { access: { some: { memberId } } },
      ],
    },
    include: {
      _count: { select: { items: true, columns: true, groups: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return boards.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    color: b.color,
    templateKey: b.templateKey,
    isPrivate: b.isPrivate,
    itemCount: b._count.items,
    columnCount: b._count.columns,
    groupCount: b._count.groups,
    createdAt: b.createdAt,
  }));
}

/** Grant or update a member's access to a board. */
export async function setBoardAccess(
  workspaceId: string,
  boardId: string,
  memberId: string,
  permission: BoardPermission,
  grantedBy?: string,
) {
  // Verify the board belongs to this workspace
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardAccess.upsert({
    where: { boardId_memberId: { boardId, memberId } },
    create: { boardId, memberId, permission, grantedBy },
    update: { permission, grantedBy },
  });
}

/** Revoke a member's access to a board. */
export async function removeBoardAccess(workspaceId: string, boardId: string, memberId: string) {
  // Verify the board belongs to this workspace
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardAccess.delete({
    where: { boardId_memberId: { boardId, memberId } },
  });
}

/** Check if a member has at least minPermission on a board. */
export async function checkBoardPermission(
  boardId: string,
  memberId: string,
  workspaceId: string,
  workspaceRole: string,
  minPermission: 'VIEWER' | 'EDITOR' | 'ADMIN'
): Promise<boolean> {
  // OWNER workspace role always has full access
  if (workspaceRole === 'OWNER') return true;

  // Check if board belongs to workspace
  const board = await prisma.board.findFirst({ where: { id: boardId, workspaceId } });
  if (!board) return false;

  // Public boards: anyone can view, EDITOR+ to edit
  if (!board.isPrivate && minPermission === 'VIEWER') return true;

  // Check board access record
  const access = await prisma.boardAccess.findUnique({
    where: { boardId_memberId: { boardId, memberId } }
  });
  if (!access) return false;

  const hierarchy: Record<string, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };
  return hierarchy[access.permission] >= hierarchy[minPermission];
}

/** List all members who have explicit access to a board. */
export async function getBoardMembers(workspaceId: string, boardId: string) {
  // Verify the board belongs to this workspace
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardAccess.findMany({
    where: { boardId },
    include: {
      member: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { grantedAt: "asc" },
  });
}

// ══════════════════════════════════════════════════════════════════
// BOARD ITEM COMMENTS
// ══════════════════════════════════════════════════════════════════

export async function getItemComments(
  workspaceId: string,
  boardId: string,
  itemId: string,
) {
  // Verify board ownership and item belongs to board in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId }, select: { id: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItemComment.findMany({
    where: { itemId },
    include: {
      author: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function createItemComment(
  workspaceId: string,
  boardId: string,
  itemId: string,
  authorId: string,
  body: string,
) {
  // Validate board and item in parallel — they are independent checks
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  // Stamp lastActivityAt and create comment in parallel
  const [comment] = await Promise.all([
    prisma.boardItemComment.create({
      data: { itemId, authorId, body },
      include: {
        author: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.boardItem.update({
      where: { id: itemId },
      data: { lastActivityAt: new Date() },
    }),
  ]);
  return comment;
}

export async function editItemComment(
  workspaceId: string,
  boardId: string,
  itemId: string,
  commentId: string,
  userId: string,
  body: string,
) {
  // Validate board and fetch comment in parallel
  const [board, comment] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItemComment.findFirst({
      where: { id: commentId, itemId },
      include: { author: true },
    }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");

  // Only the comment author can edit
  if (comment.author.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "Only the comment author can edit this comment");
  }

  return prisma.boardItemComment.update({
    where: { id: commentId },
    data: { body, editedAt: new Date() },
    include: {
      author: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
}

export async function deleteItemComment(
  workspaceId: string,
  boardId: string,
  itemId: string,
  commentId: string,
  userId: string,
  workspaceRole: string,
) {
  const board = await prisma.board.findFirst({ where: { id: boardId, workspaceId } });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const comment = await prisma.boardItemComment.findFirst({
    where: { id: commentId, itemId },
    include: { author: true },
  });
  if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");

  const isAuthor = comment.author.userId === userId;
  const isBoardAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  if (!isAuthor && !isBoardAdmin) {
    // Check board-level ADMIN access
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
    if (!member) throw new AppError(403, "FORBIDDEN", "Not a workspace member");
    const access = await prisma.boardAccess.findUnique({
      where: { boardId_memberId: { boardId, memberId: member.id } },
    });
    if (!access || access.permission !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN", "Only the comment author or board admin can delete this comment");
    }
  }

  return prisma.boardItemComment.delete({ where: { id: commentId } });
}

export async function toggleCommentReaction(
  workspaceId: string,
  boardId: string,
  itemId: string,
  commentId: string,
  userId: string,
  emoji: string,
) {
  // Verify board ownership (no need to re-read comment outside the transaction)
  const board = await prisma.board.findFirst({ where: { id: boardId, workspaceId } });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  // Wrap the read-modify-write of the reactions JSON in a serializable
  // transaction to prevent two concurrent toggles from losing one update.
  return prisma.$transaction(async (tx) => {
    const comment = await tx.boardItemComment.findFirst({ where: { id: commentId, itemId } });
    if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");

    const reactions = (comment.reactions as Record<string, string[]>) ?? {};
    const users: string[] = reactions[emoji] ?? [];

    if (users.includes(userId)) {
      reactions[emoji] = users.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userId];
    }

    return tx.boardItemComment.update({
      where: { id: commentId },
      data: { reactions },
      include: {
        author: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  });
}

export async function getItemActivities(
  workspaceId: string,
  boardId: string,
  itemId: string,
) {
  // Verify board ownership and item belongs to board in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId }, select: { id: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItemActivity.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function duplicateItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
  actorId?: string,
  actorName?: string,
) {
  // Validate board ownership and fetch original item in parallel
  const [board, original] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({
      where: { id: itemId, boardId },
      include: { values: true },
    }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!original) throw new AppError(404, "NOT_FOUND", "Board item not found");

  const newItem = await prisma.boardItem.create({
    data: {
      boardId: original.boardId,
      groupId: original.groupId,
      name: original.name,
      description: original.description,
      order: original.order + 1,
      values: {
        create: original.values.map((v) => ({
          columnId: v.columnId,
          textValue: v.textValue,
          numberValue: v.numberValue,
          dateValue: v.dateValue,
          jsonValue: v.jsonValue ?? undefined,
        })),
      },
    },
    include: {
      values: {
        include: {
          column: { select: { id: true, key: true, type: true } },
        },
      },
    },
  });

  await createBoardItemActivity({
    itemId: newItem.id,
    actorId,
    actorName,
    type: "item_created",
    newValue: newItem.name,
  });

  return newItem;
}

export async function updateItemDescription(
  workspaceId: string,
  boardId: string,
  itemId: string,
  description: string | null,
) {
  // Validate board ownership and item existence in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItem.update({
    where: { id: itemId },
    data: { description, lastActivityAt: new Date() },
  });
}

// ══════════════════════════════════════════════════════════════════
// SUB-ITEMS
// ══════════════════════════════════════════════════════════════════

export async function getSubItems(
  workspaceId: string,
  boardId: string,
  parentItemId: string,
) {
  const board = await prisma.board.findFirst({ where: { id: boardId, workspaceId } });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardItem.findMany({
    where: { parentItemId, boardId },
    orderBy: { order: "asc" },
  });
}

export async function createSubItem(
  workspaceId: string,
  boardId: string,
  parentItemId: string,
  name: string,
) {
  // Validate board, fetch parent, and compute max order in parallel
  const [board, parent, maxOrder] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: parentItemId, boardId } }),
    prisma.boardItem.aggregate({ where: { parentItemId }, _max: { order: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!parent) throw new AppError(404, "NOT_FOUND", "Parent item not found");

  return prisma.boardItem.create({
    data: {
      boardId,
      groupId: parent.groupId,
      parentItemId,
      name,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export async function updateSubItem(
  workspaceId: string,
  boardId: string,
  subItemId: string,
  data: Partial<{ name: string; done: boolean }>,
) {
  // Verify board ownership and sub-item belongs to board in parallel
  const [board, subItem] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: subItemId, boardId, parentItemId: { not: null } } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!subItem) throw new AppError(404, "NOT_FOUND", "Sub-item not found");

  return prisma.boardItem.update({ where: { id: subItemId }, data });
}

export async function deleteSubItem(
  workspaceId: string,
  boardId: string,
  subItemId: string,
) {
  // Verify board ownership and sub-item belongs to board in parallel
  const [board, subItem] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: subItemId, boardId, parentItemId: { not: null } } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!subItem) throw new AppError(404, "NOT_FOUND", "Sub-item not found");

  return prisma.boardItem.delete({ where: { id: subItemId } });
}

// ══════════════════════════════════════════════════════════════════
// ITEM FILES
// ══════════════════════════════════════════════════════════════════

export async function getItemFiles(
  workspaceId: string,
  boardId: string,
  itemId: string,
) {
  // Verify board ownership and item belongs to board in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId }, select: { id: true } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItemFile.findMany({
    where: { itemId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function createItemFile(
  workspaceId: string,
  boardId: string,
  itemId: string,
  uploadedById: string,
  fileData: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  },
) {
  // Validate board ownership and item existence in parallel
  const [board, item] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItem.findFirst({ where: { id: itemId, boardId } }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!item) throw new AppError(404, "NOT_FOUND", "Board item not found");

  return prisma.boardItemFile.create({
    data: { itemId, uploadedById, ...fileData },
  });
}

export async function deleteItemFile(
  workspaceId: string,
  boardId: string,
  fileId: string,
) {
  // Verify board ownership and file belongs to a board item in parallel
  const [board, file] = await Promise.all([
    prisma.board.findFirst({ where: { id: boardId, workspaceId } }),
    prisma.boardItemFile.findFirst({
      where: { id: fileId, item: { boardId } },
    }),
  ]);
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");
  if (!file) throw new AppError(404, "NOT_FOUND", "File not found");

  return prisma.boardItemFile.delete({ where: { id: fileId } });
}
