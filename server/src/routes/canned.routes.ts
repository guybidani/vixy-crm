import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import * as cannedService from "../services/canned.service";

export const cannedRouter = Router();

// List canned responses
cannedRouter.get("/", async (req, res, next) => {
  try {
    const { category } = req.query;
    const data = await cannedService.listCannedResponses(
      req.workspaceId!,
      category as string | undefined,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Create
const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.string().optional(),
});

cannedRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const data = await cannedService.createCannedResponse(req.workspaceId!, {
      ...req.body,
      memberId: req.memberId!,
    });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// Update
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z.string().optional(),
});

cannedRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const data = await cannedService.updateCannedResponse(
      req.workspaceId!,
      req.params.id as string,
      req.body,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Delete
cannedRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    await cannedService.deleteCannedResponse(req.workspaceId!, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
