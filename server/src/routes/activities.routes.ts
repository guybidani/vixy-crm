import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as activitiesService from "../services/activities.service";
import { prisma } from "../db/client";

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
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const data = await activitiesService.getRecentContacts(
      req.workspaceId!,
      member.id,
      limit,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.get("/", async (req, res, next) => {
  try {
    const activities = await activitiesService.list({
      workspaceId: req.workspaceId!,
      contactId: req.query.contactId as string,
      dealId: req.query.dealId as string,
      ticketId: req.query.ticketId as string,
      limit: Math.min(Number(req.query.limit) || 50, 100),
    });
    res.json(activities);
  } catch (err) {
    next(err);
  }
});

activitiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }
    const activity = await activitiesService.create(
      req.workspaceId!,
      member.id,
      req.body,
    );
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
});
