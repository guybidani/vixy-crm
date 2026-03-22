import { Router } from "express";
import { prisma } from "../db/client";
import * as calendarService from "../services/calendar.service";

export const calendarRouter = Router();

/**
 * GET /api/v1/calendar/auth-url
 * Returns the Google OAuth2 consent URL with a bound state token.
 */
calendarRouter.get("/auth-url", async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }

    const url = calendarService.getAuthUrl(req.workspaceId!, member.id);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/calendar/callback
 * Handles the OAuth callback from Google. Exchanges the code for tokens,
 * stores the integration, then redirects to /settings?tab=integrations.
 *
 * Note: requireWorkspace is applied globally but the callback may arrive
 * without X-Workspace-Id. We recover workspace/member from the state param.
 */
calendarRouter.get("/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      return res.redirect(`/settings?tab=integrations&calendar_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect("/settings?tab=integrations&calendar_error=missing_params");
    }

    await calendarService.handleCallback(code, state);

    res.redirect("/settings?tab=integrations&calendar_connected=1");
  } catch (err) {
    console.error("[CalendarCallback] error:", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    res.redirect(
      `/settings?tab=integrations&calendar_error=${encodeURIComponent(message)}`,
    );
  }
});

/**
 * POST /api/v1/calendar/disconnect
 * Removes the current user's Google Calendar integration.
 */
calendarRouter.post("/disconnect", async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }

    await calendarService.disconnect(req.workspaceId!, member.id);
    res.json({ success: true, message: "Google Calendar disconnected" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/calendar/status
 * Returns the current integration status for the authenticated member.
 */
calendarRouter.get("/status", async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: req.workspaceId!, userId: req.user!.userId },
    });
    if (!member) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Not a workspace member" },
      });
    }

    const status = await calendarService.getIntegrationStatus(
      req.workspaceId!,
      member.id,
    );
    res.json(status);
  } catch (err) {
    next(err);
  }
});
