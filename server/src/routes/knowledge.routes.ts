import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { audit } from "../services/audit.service";
import * as knowledgeService from "../services/knowledge.service";
import { prisma } from "../db/client";

export const knowledgeRouter = Router();

const categorySchema = z.object({
  name: z.string().min(1, "שם קטגוריה נדרש"),
  slug: z.string().min(1),
  order: z.number().optional(),
  parentId: z.string().uuid().optional(),
});

const articleSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  slug: z.string().min(1),
  body: z.string().min(1, "תוכן נדרש"),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const articleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// GET /api/v1/kb/categories
knowledgeRouter.get("/categories", async (req, res, next) => {
  try {
    const categories = await knowledgeService.listCategories(req.workspaceId!);
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/kb/categories
knowledgeRouter.post(
  "/categories",
  requireRole("OWNER", "ADMIN"),
  validate(categorySchema),
  async (req, res, next) => {
    try {
      const category = await knowledgeService.createCategory(
        req.workspaceId!,
        req.body,
      );
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "kb.category_create",
        entityType: "KbCategory",
        entityId: category.id,
        metadata: { name: req.body.name },
        ip: req.ip,
      });
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/kb/articles
knowledgeRouter.get("/articles", async (req, res, next) => {
  try {
    const articles = await knowledgeService.listArticles({
      workspaceId: req.workspaceId!,
      categoryId: req.query.categoryId as string,
      status: req.query.status as string,
      search: req.query.search as string,
    });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/kb/articles/:id
knowledgeRouter.get("/articles/:id", async (req, res, next) => {
  try {
    const article = await knowledgeService.getArticle(
      req.workspaceId!,
      req.params.id,
    );
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/kb/articles
knowledgeRouter.post(
  "/articles",
  validate(articleSchema),
  async (req, res, next) => {
    try {
      const article = await knowledgeService.createArticle(
        req.workspaceId!,
        req.user!.userId,
        req.body,
      );
      res.status(201).json(article);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/kb/articles/:id
knowledgeRouter.patch(
  "/articles/:id",
  validate(articleUpdateSchema),
  async (req, res, next) => {
    try {
      const article = await knowledgeService.updateArticle(
        req.workspaceId!,
        req.params.id,
        req.body,
      );
      res.json(article);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/kb/articles/:id
knowledgeRouter.delete(
  "/articles/:id",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await knowledgeService.deleteArticle(req.workspaceId!, req.params.id);
      audit({
        workspaceId: req.workspaceId!,
        userId: req.user!.userId,
        action: "kb.article_delete",
        entityType: "KbArticle",
        entityId: req.params.id,
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/kb/articles/:id/helpful
knowledgeRouter.post("/articles/:id/helpful", async (req, res, next) => {
  try {
    const helpful = req.body.helpful !== false;
    await knowledgeService.voteArticle(
      req.workspaceId!,
      req.params.id,
      helpful,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
