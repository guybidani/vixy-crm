import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../db/client";
import type { WorkspaceRole } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      workspaceId?: string;
      /** The authenticated user's role in the current workspace. */
      workspaceRole?: WorkspaceRole;
      /** The workspace member ID for the authenticated user. */
      memberId?: string;
    }
  }
}

// ─── Workspace membership cache (60s TTL) ───
interface CachedMembership {
  memberId: string;
  role: WorkspaceRole;
  expiresAt: number;
}

const membershipCache = new Map<string, CachedMembership>();

const MEMBERSHIP_CACHE_TTL_MS = 60_000;

// ─── Periodic cleanup of expired membership cache entries (every 5 min) ───
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of membershipCache) {
    if (now > entry.expiresAt) {
      membershipCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Token required" } });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({
      error: { code: "TOKEN_EXPIRED", message: "Invalid or expired token" },
    });
  }
}

/**
 * Requires X-Workspace-Id header AND verifies the authenticated user
 * is actually a member of that workspace. Attaches workspaceRole to req.
 */
export async function requireWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const workspaceId = req.headers["x-workspace-id"] as string;
  if (!workspaceId) {
    return res.status(400).json({
      error: {
        code: "WORKSPACE_REQUIRED",
        message: "X-Workspace-Id header required",
      },
    });
  }

  // Verify user is a member of this workspace (with cache)
  try {
    const cacheKey = `${req.user!.userId}:${workspaceId}`;
    const now = Date.now();
    const cached = membershipCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      req.workspaceRole = cached.role;
      req.memberId = cached.memberId;
    } else {
      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: req.user!.userId },
      });
      if (!membership) {
        membershipCache.delete(cacheKey);
        return res.status(403).json({
          error: {
            code: "NOT_A_MEMBER",
            message: "You are not a member of this workspace",
          },
        });
      }
      membershipCache.set(cacheKey, {
        memberId: membership.id,
        role: membership.role,
        expiresAt: now + MEMBERSHIP_CACHE_TTL_MS,
      });
      req.workspaceRole = membership.role;
      req.memberId = membership.id;
    }
  } catch {
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  }

  req.workspaceId = workspaceId;
  next();
}

/**
 * Middleware factory: restrict access to users with one of the given roles.
 * Must be used AFTER requireWorkspace (which sets req.workspaceRole).
 *
 * Usage: `router.post("/settings", requireRole("OWNER", "ADMIN"), handler)`
 */
export function requireRole(...allowed: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspaceRole || !allowed.includes(req.workspaceRole)) {
      return res.status(403).json({
        error: {
          code: "INSUFFICIENT_ROLE",
          message: "You do not have permission to perform this action",
        },
      });
    }
    next();
  };
}
