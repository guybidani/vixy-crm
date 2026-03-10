import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import { prisma } from "../db/client";
import * as documentService from "../services/document.service";

export const documentRouter = Router();

// ─── List documents ───
// GET /api/v1/documents?type=FILE|RICH_TEXT&search=...&page=1&limit=25
documentRouter.get("/", async (req, res, next) => {
  try {
    const result = await documentService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 25, 100),
      type: req.query.type as "FILE" | "RICH_TEXT" | undefined,
      search: req.query.search as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Get entity documents ───
// GET /api/v1/documents/entity/:type/:entityId
documentRouter.get("/entity/:type/:entityId", async (req, res, next) => {
  try {
    const entityType = req.params.type as
      | "contact"
      | "deal"
      | "company"
      | "ticket";
    if (!["contact", "deal", "company", "ticket"].includes(entityType)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid entity type" },
      });
    }
    const docs = await documentService.getEntityDocuments(
      req.workspaceId!,
      entityType,
      req.params.entityId as string,
    );
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

// ─── Upload file document ───
// POST /api/v1/documents/upload (multipart/form-data)
documentRouter.post(
  "/upload",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "No file provided" },
        });
      }

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
      });
      if (!member) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Not a workspace member" },
        });
      }

      const doc = await documentService.createFile({
        workspaceId: req.workspaceId!,
        memberId: member.id,
        title: (req.body.title as string) || req.file.originalname,
        fileName: req.file.originalname,
        fileUrl: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Create rich text document ───
// POST /api/v1/documents/rich-text
const richTextSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  content: z.string().default(""),
});

documentRouter.post(
  "/rich-text",
  validate(richTextSchema),
  async (req, res, next) => {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
      });
      if (!member) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Not a workspace member" },
        });
      }

      const doc = await documentService.createRichText({
        workspaceId: req.workspaceId!,
        memberId: member.id,
        title: req.body.title,
        content: req.body.content,
      });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Get single document ───
// GET /api/v1/documents/:id
documentRouter.get("/:id", async (req, res, next) => {
  try {
    const doc = await documentService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    if (!doc) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Document not found" } });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// ─── Update document ───
// PUT /api/v1/documents/:id
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

documentRouter.put("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const doc = await documentService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    if (!doc) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// ─── Delete document ───
// DELETE /api/v1/documents/:id
documentRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await documentService.remove(
      req.workspaceId!,
      req.params.id as string,
    );
    if (!result) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Link document to entity ───
// POST /api/v1/documents/:id/link
const linkSchema = z.object({
  entityType: z.enum(["contact", "deal", "company", "ticket"]),
  entityId: z.string().uuid(),
});

documentRouter.post(
  "/:id/link",
  validate(linkSchema),
  async (req, res, next) => {
    try {
      const link = await documentService.linkToEntity(req.workspaceId!, {
        documentId: req.params.id as string,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
      });
      if (!link) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Document not found" },
        });
      }
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Unlink document from entity ───
// DELETE /api/v1/documents/:id/link/:linkId
documentRouter.delete("/:id/link/:linkId", async (req, res, next) => {
  try {
    const result = await documentService.unlinkFromEntity(
      req.workspaceId!,
      req.params.id as string,
      req.params.linkId as string,
    );
    if (!result) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Link not found" },
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});
