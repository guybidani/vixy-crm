import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as activitiesService from "../services/activities.service";

export const activitiesRouter = Router();

const createSchema = z.object({
  type: z.enum([
    "NOTE",
    "CALL",
    "EMAIL",
    "MEETING",
    "WHATSAPP",
    "STATUS_CHANGE",
    "SYSTEM",
  ]),
  subject: z.string().optional(),
  body: z.string().optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  metadata: z.any().optional(),
});

activitiesRouter.get("/recent-contacts", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const data = await activitiesService.getRecentContacts(
      req.workspaceId!,
      req.memberId!,
      limit,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.get("/", async (req, res, next) => {
  try {
    const result = await activitiesService.list({
      workspaceId: req.workspaceId!,
      contactId: req.query.contactId as string,
      dealId: req.query.dealId as string,
      ticketId: req.query.ticketId as string,
      companyId: req.query.companyId as string,
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.min(Number(req.query.limit) || 50, 200),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const activity = await activitiesService.create(
      req.workspaceId!,
      req.memberId!,
      req.body,
    );
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  metadata: z.any().optional(),
});

activitiesRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const activity = await activitiesService.update(
      req.workspaceId!,
      req.memberId!,
      req.params.id as string,
      req.body,
    );
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await activitiesService.remove(
      req.workspaceId!,
      req.memberId!,
      req.params.id as string,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
