import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import * as contactsService from "../services/contacts.service";
import { prisma } from "../db/client";

export const contactsRouter = Router();

const createSchema = z.object({
  firstName: z.string().min(1, "שם פרטי נדרש"),
  lastName: z.string().min(1, "שם משפחה נדרש"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().uuid().optional().nullable(),
  position: z.string().optional(),
  source: z.string().optional(),
  status: z
    .enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"])
    .optional(),
  leadScore: z.number().min(0).max(100).optional(),
  leadHeat: z.enum(["HOT", "WARM", "LUKEWARM", "COLD", "FROZEN"]).optional().nullable(),
  nextFollowUpDate: z.string().datetime().optional().nullable(),
});

const updateSchema = createSchema.partial();

// GET /api/v1/contacts
contactsRouter.get("/", async (req, res, next) => {
  try {
    const result = await contactsService.list({
      workspaceId: req.workspaceId!,
      page: Number(req.query.page) || 1,
      limit: Math.min(Number(req.query.limit) || 25, 100),
      search: req.query.search as string,
      status: req.query.status as string,
      companyId: req.query.companyId as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortDir: (req.query.sortDir as "asc" | "desc") || "desc",
      needsFollowUp: req.query.needsFollowUp === "true",
      includeDeleted: req.query.includeDeleted === "true",
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/board
contactsRouter.get("/board", async (req, res, next) => {
  try {
    const result = await contactsService.board(req.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/contacts/bulk-delete
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

contactsRouter.post(
  "/bulk-delete",
  requireRole("OWNER", "ADMIN"),
  validate(bulkDeleteSchema),
  async (req, res, next) => {
    try {
      const { ids } = req.body;
      // Soft delete — consistent with single-contact delete so bulk actions
      // are undo-able. Only touches rows not already tombstoned.
      const result = await prisma.contact.updateMany({
        where: {
          id: { in: ids },
          workspaceId: req.workspaceId!,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      res.json({ deleted: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/contacts/bulk-update
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  data: z.object({
    status: z
      .enum(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"])
      .optional(),
    // Bulk assign contacts to a company (or clear with null)
    companyId: z.string().uuid().nullable().optional(),
    tagId: z.string().uuid().optional(),
  }),
});

contactsRouter.post(
  "/bulk-update",
  requireRole("OWNER", "ADMIN"),
  validate(bulkUpdateSchema),
  async (req, res, next) => {
    try {
      const { ids, data } = req.body;

      // Build a single updateMany payload for direct column updates so we
      // only hit the DB once regardless of how many fields are changing.
      const updateData: Record<string, unknown> = {};
      if (data.status) updateData.status = data.status;
      if (data.companyId !== undefined) {
        // Validate the company belongs to this workspace to prevent BOLA:
        // otherwise an attacker could re-parent contacts to a company in
        // another workspace.
        if (data.companyId !== null) {
          const company = await prisma.company.findFirst({
            where: { id: data.companyId, workspaceId: req.workspaceId! },
            select: { id: true },
          });
          if (!company) {
            return res.status(400).json({
              error: { code: "INVALID_REFERENCE", message: "Company not found in workspace" },
            });
          }
        }
        updateData.companyId = data.companyId;
      }

      let updatedCount = 0;
      if (Object.keys(updateData).length > 0) {
        const result = await prisma.contact.updateMany({
          where: {
            id: { in: ids },
            workspaceId: req.workspaceId!,
            deletedAt: null,
          },
          data: updateData,
        });
        updatedCount = result.count;
      }

      if (data.tagId) {
        const tag = await prisma.tag.findFirst({
          where: { id: data.tagId, workspaceId: req.workspaceId! },
        });
        if (!tag) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Tag not found" },
          });
        }
        // Verify all contacts belong to this workspace before tagging —
        // prevents BOLA: attacker submitting foreign contact IDs to attach tags
        const ownedContacts = await prisma.contact.findMany({
          where: {
            id: { in: ids },
            workspaceId: req.workspaceId!,
            deletedAt: null,
          },
          select: { id: true },
        });
        const ownedIds = ownedContacts.map((c) => c.id);
        await Promise.all(
          ownedIds.map((contactId: string) =>
            prisma.tagOnContact.upsert({
              where: { contactId_tagId: { contactId, tagId: data.tagId } },
              create: { contactId, tagId: data.tagId },
              update: {},
            }),
          ),
        );
        if (updatedCount === 0) updatedCount = ownedIds.length;
      }

      res.json({ success: true, updated: updatedCount });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/contacts/:id
contactsRouter.get("/:id", async (req, res, next) => {
  try {
    const contact = await contactsService.getById(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/:id/timeline
contactsRouter.get("/:id/timeline", async (req, res, next) => {
  try {
    const timeline = await contactsService.getTimeline(
      req.workspaceId!,
      req.params.id as string,
    );
    res.json(timeline);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/contacts
contactsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const contact = await contactsService.create(
      req.workspaceId!,
      req.memberId!,
      req.body,
    );
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/contacts/:id
contactsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const contact = await contactsService.update(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/contacts/:id (soft delete)
contactsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    await contactsService.remove(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/contacts/:id/restore — un-tombstone a soft-deleted contact
contactsRouter.post(
  "/:id/restore",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      await contactsService.restore(req.workspaceId!, req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);
