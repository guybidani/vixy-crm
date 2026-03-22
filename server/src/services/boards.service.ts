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
  }>,
) {
  const existing = await prisma.board.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.board.update({
    where: { id },
    data,
  });
}

// ── Delete board ───────────────────────────────────────────────────
export async function remove(workspaceId: string, id: string) {
  const existing = await prisma.board.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.board.delete({ where: { id } });
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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const maxOrder = await prisma.boardColumn.aggregate({
    where: { boardId },
    _max: { order: true },
  });

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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const col = await prisma.boardColumn.findFirst({
    where: { id: columnId, boardId },
  });
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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const maxOrder = await prisma.boardGroup.aggregate({
    where: { boardId },
    _max: { order: true },
  });

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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

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
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardGroup.delete({ where: { id: groupId } });
}

// ══════════════════════════════════════════════════════════════════
// ITEMS
// ══════════════════════════════════════════════════════════════════

export async function addItem(
  workspaceId: string,
  boardId: string,
  groupId: string,
  data: { name: string },
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const maxOrder = await prisma.boardItem.aggregate({
    where: { groupId },
    _max: { order: true },
  });

  return prisma.boardItem.create({
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
}

export async function updateItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
  data: Partial<{ name: string; groupId: string; order: number }>,
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  return prisma.boardItem.update({
    where: { id: itemId },
    data,
    include: {
      values: {
        include: {
          column: { select: { id: true, key: true, type: true } },
        },
      },
    },
  });
}

export async function deleteItem(
  workspaceId: string,
  boardId: string,
  itemId: string,
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

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
) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });
  if (!board) throw new AppError(404, "NOT_FOUND", "Board not found");

  const results = await Promise.all(
    values.map((v) =>
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
    ),
  );

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
