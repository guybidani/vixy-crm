import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as boardsService from "../services/boards.service";
import { BOARD_TEMPLATES } from "../services/board-templates";

export const boardsRouter = Router();

// ── Templates ──────────────────────────────────────────────────────

boardsRouter.get("/templates", (_req, res) => {
  const templates = Object.entries(BOARD_TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
    icon: t.icon,
    color: t.color,
    columnCount: t.columns.length,
    columns: t.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
    })),
  }));
  res.json(templates);
});

// ── Board CRUD ─────────────────────────────────────────────────────

const createBoardSchema = z.object({
  name: z.string().min(1, "שם בורד נדרש"),
  templateKey: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET /boards
boardsRouter.get("/", async (req, res, next) => {
  try {
    const boards = await boardsService.list(req.workspaceId!);
    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// POST /boards
boardsRouter.post("/", validate(createBoardSchema), async (req, res, next) => {
  try {
    const board = await boardsService.create(
      req.workspaceId!,
      req.user!.userId,
      req.body,
    );
    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// GET /boards/:id
boardsRouter.get("/:id", async (req, res, next) => {
  try {
    const board = await boardsService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// PATCH /boards/:id
boardsRouter.patch(
  "/:id",
  validate(updateBoardSchema),
  async (req, res, next) => {
    try {
      const board = await boardsService.update(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.json(board);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /boards/:id
boardsRouter.delete(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await boardsService.remove(req.workspaceId!, req.params.id as string);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "board.delete",
        entityType: "Board",
        entityId: req.params.id as string,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Columns ────────────────────────────────────────────────────────

const addColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1, "שם עמודה נדרש"),
  type: z.enum([
    "TEXT",
    "NUMBER",
    "STATUS",
    "DATE",
    "PERSON",
    "EMAIL",
    "PHONE",
    "LINK",
    "PRIORITY",
    "CHECKBOX",
  ]),
  width: z.string().optional(),
  options: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        color: z.string(),
      }),
    )
    .optional(),
});

const updateColumnSchema = z.object({
  label: z.string().min(1).optional(),
  width: z.string().optional(),
  order: z.number().optional(),
  options: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        color: z.string(),
      }),
    )
    .optional(),
});

// POST /boards/:id/columns
boardsRouter.post(
  "/:id/columns",
  validate(addColumnSchema),
  async (req, res, next) => {
    try {
      const col = await boardsService.addColumn(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.status(201).json(col);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /boards/:id/columns/:colId
boardsRouter.patch(
  "/:id/columns/:colId",
  validate(updateColumnSchema),
  async (req, res, next) => {
    try {
      const col = await boardsService.updateColumn(
        req.workspaceId!,
        req.params.id as string,
        req.params.colId as string,
        req.body,
      );
      res.json(col);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /boards/:id/columns/:colId
boardsRouter.delete("/:id/columns/:colId", async (req, res, next) => {
  try {
    await boardsService.deleteColumn(
      req.workspaceId!,
      req.params.id as string,
      req.params.colId as string,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Groups ─────────────────────────────────────────────────────────

const addGroupSchema = z.object({
  name: z.string().min(1, "שם קבוצה נדרש"),
  color: z.string().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  collapsed: z.boolean().optional(),
});

// POST /boards/:id/groups
boardsRouter.post(
  "/:id/groups",
  validate(addGroupSchema),
  async (req, res, next) => {
    try {
      const group = await boardsService.addGroup(
        req.workspaceId!,
        req.params.id as string,
        req.body,
      );
      res.status(201).json(group);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /boards/:id/groups/:groupId
boardsRouter.patch(
  "/:id/groups/:groupId",
  validate(updateGroupSchema),
  async (req, res, next) => {
    try {
      const group = await boardsService.updateGroup(
        req.workspaceId!,
        req.params.id as string,
        req.params.groupId as string,
        req.body,
      );
      res.json(group);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /boards/:id/groups/:groupId
boardsRouter.delete("/:id/groups/:groupId", async (req, res, next) => {
  try {
    await boardsService.deleteGroup(
      req.workspaceId!,
      req.params.id as string,
      req.params.groupId as string,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Items ──────────────────────────────────────────────────────────

const addItemSchema = z.object({
  name: z.string().min(1, "שם פריט נדרש"),
});

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  groupId: z.string().uuid().optional(),
  order: z.number().optional(),
});

// POST /boards/:id/groups/:groupId/items
boardsRouter.post(
  "/:id/groups/:groupId/items",
  validate(addItemSchema),
  async (req, res, next) => {
    try {
      const item = await boardsService.addItem(
        req.workspaceId!,
        req.params.id as string,
        req.params.groupId as string,
        req.body,
      );
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /boards/:id/items/:itemId
boardsRouter.patch(
  "/:id/items/:itemId",
  validate(updateItemSchema),
  async (req, res, next) => {
    try {
      const item = await boardsService.updateItem(
        req.workspaceId!,
        req.params.id as string,
        req.params.itemId as string,
        req.body,
      );
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /boards/:id/items/:itemId
boardsRouter.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    await boardsService.deleteItem(
      req.workspaceId!,
      req.params.id as string,
      req.params.itemId as string,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Item Values ────────────────────────────────────────────────────

const updateValuesSchema = z.object({
  values: z.array(
    z.object({
      columnId: z.string().uuid(),
      textValue: z.string().nullable().optional(),
      numberValue: z.number().nullable().optional(),
      dateValue: z.string().nullable().optional(),
      jsonValue: z.any().optional(),
    }),
  ),
});

// PUT /boards/:id/items/:itemId/values
boardsRouter.put(
  "/:id/items/:itemId/values",
  validate(updateValuesSchema),
  async (req, res, next) => {
    try {
      const results = await boardsService.updateItemValues(
        req.workspaceId!,
        req.params.id as string,
        req.params.itemId as string,
        req.body.values,
      );
      res.json(results);
    } catch (err) {
      next(err);
    }
  },
);
