import { Router } from "express";
import * as notificationService from "../services/notification.service";

export const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get("/", async (req, res, next) => {
  try {
    const result = await notificationService.list(
      req.workspaceId!,
      req.user!.userId,
      {
        limit: Math.min(Number(req.query.limit) || 50, 100),
        offset: Number(req.query.offset) || 0,
        unreadOnly: req.query.unreadOnly === "true",
      },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/notifications/unread-count
notificationRouter.get("/unread-count", async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.workspaceId!,
      req.user!.userId,
    );
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch("/:id/read", async (req, res, next) => {
  try {
    await notificationService.markRead(
      req.workspaceId!,
      req.user!.userId,
      req.params.id as string,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/read-all
notificationRouter.patch("/read-all", async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.workspaceId!, req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/notifications/:id
notificationRouter.delete("/:id", async (req, res, next) => {
  try {
    await notificationService.remove(
      req.workspaceId!,
      req.user!.userId,
      req.params.id as string,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
