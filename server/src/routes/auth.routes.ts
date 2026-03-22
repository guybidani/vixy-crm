import { Router, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { config } from "../config";
import { audit } from "../services/audit.service";
import * as authService from "../services/auth.service";
import { prisma } from "../db/client";

export const authRouter = Router();

const REFRESH_COOKIE = "vixy_rt";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/** Set the refresh token as an httpOnly cookie (invisible to JS). */
function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: "/api/v1/auth", // Only sent to auth endpoints
    maxAge: REFRESH_MAX_AGE,
  });
}

/** Clear the refresh token cookie. */
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: "/api/v1/auth",
  });
}

const passwordSchema = z
  .string()
  .min(8, "סיסמה חייבת להיות לפחות 8 תווים")
  .regex(/[A-Z]|[a-z]/, "סיסמה חייבת לכלול לפחות אות אחת")
  .regex(/[0-9]/, "סיסמה חייבת לכלול לפחות ספרה אחת");

const registerSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  password: passwordSchema,
  name: z.string().min(1, "שם נדרש"),
  workspaceName: z.string().min(1, "שם סביבת עבודה נדרש"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "שם סביבת עבודה נדרש"),
});

const inviteSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  role: z.enum(["ADMIN", "AGENT"]),
});

// POST /api/v1/auth/register
authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      const { refreshToken, ...body } = result;
      setRefreshCookie(res, refreshToken);
      audit({
        userId: result.user.id,
        action: "user.register",
        ip: req.ip,
      });
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/login
authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      const { refreshToken, ...body } = result;
      setRefreshCookie(res, refreshToken);
      audit({
        userId: result.user.id,
        action: "user.login",
        ip: req.ip,
      });
      res.json(body);
    } catch (err) {
      audit({
        userId: "unknown",
        action: "user.login_failed",
        metadata: { email: req.body.email },
        ip: req.ip,
      });
      next(err);
    }
  },
);

// POST /api/v1/auth/refresh — reads refresh token from httpOnly cookie
authRouter.post("/refresh", authLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      return res.status(401).json({
        error: { code: "NO_REFRESH_TOKEN", message: "No refresh token" },
      });
    }
    const tokens = await authService.refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
});

// POST /api/v1/auth/logout — revokes refresh token and clears cookie
authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    // Revoke from DB (fire-and-forget)
    const crypto = await import("crypto");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {}); // ignore if already deleted
  }
  clearRefreshCookie(res);
  res.json({ loggedOut: true });
});

// POST /api/v1/auth/change-password (protected)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

authRouter.post(
  "/change-password",
  requireAuth,
  authLimiter,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      await authService.changePassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword,
      );
      // Clear the refresh cookie — forces re-login with new password
      clearRefreshCookie(res);
      audit({
        userId: req.user!.userId,
        action: "user.password_change",
        ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/auth/me (protected)
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/workspaces (protected - create new workspace)
authRouter.post(
  "/workspaces",
  requireAuth,
  validate(createWorkspaceSchema),
  async (req, res, next) => {
    try {
      const workspace = await authService.createWorkspace(
        req.user!.userId,
        req.body.name,
      );
      res.status(201).json(workspace);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/auth/workspaces/:id/members (protected — requires membership)
authRouter.get(
  "/workspaces/:id/members",
  requireAuth,
  async (req, res, next) => {
    try {
      const workspaceId = req.params.id as string;
      // Verify the caller is a member of this workspace (prevents BOLA)
      const callerMembership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: req.user!.userId },
      });
      if (!callerMembership) {
        return res.status(403).json({
          error: {
            code: "NOT_A_MEMBER",
            message: "You are not a member of this workspace",
          },
        });
      }
      const members = await authService.getWorkspaceMembers(workspaceId);
      res.json(members);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/workspaces/:id/invite (protected)
authRouter.post(
  "/workspaces/:id/invite",
  requireAuth,
  validate(inviteSchema),
  async (req, res, next) => {
    try {
      const result = await authService.inviteMember(
        req.params.id as string,
        req.user!.userId,
        req.body.email,
        req.body.role,
      );
      audit({
        workspaceId: req.params.id as string,
        userId: req.user!.userId,
        action: "member.invite",
        entityType: "WorkspaceMember",
        entityId: result.memberId,
        metadata: { email: req.body.email, role: req.body.role },
        ip: req.ip,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
