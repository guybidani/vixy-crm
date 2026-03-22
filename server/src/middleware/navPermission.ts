import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

// Map route prefixes to nav permission keys
const ROUTE_TO_NAV_KEY: Record<string, string> = {
  '/contacts': 'contacts',
  '/companies': 'companies',
  '/deals': 'deals',
  '/leads': 'contacts', // leads are contacts filtered
  '/tasks': 'tasks',
  '/tickets': 'tickets',
  '/documents': 'documents',
  '/kb': 'knowledge',
  '/automations': 'automations',
  '/dashboard': 'dashboard',
};

export async function checkNavPermission(req: Request, res: Response, next: NextFunction) {
  try {
    // Find which nav key this route maps to
    const path = req.path;
    const navKey = Object.entries(ROUTE_TO_NAV_KEY).find(([prefix]) => path.startsWith(prefix))?.[1];

    if (!navKey) return next(); // Route not restricted

    const workspaceId = req.workspaceId;
    const userId = req.user?.userId;
    if (!workspaceId || !userId) return next();

    // OWNER bypasses all
    const workspaceRole = req.workspaceRole;
    if (workspaceRole === 'OWNER') return next();

    // Get member ID
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });
    if (!member) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });

    // Get workspace settings
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const settings = workspace?.settings as any;
    const navPermissions = settings?.navPermissions;

    // No permissions set = full access (default)
    if (!navPermissions || !navPermissions[member.id]) return next();

    const allowedSections = navPermissions[member.id] as string[];
    if (allowedSections.includes(navKey)) return next();

    return res.status(403).json({ error: { code: 'NAV_FORBIDDEN', message: '\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D2\u05E9\u05EA \u05DC\u05D0\u05D6\u05D5\u05E8 \u05D6\u05D4' } });
  } catch (err) {
    next(err);
  }
}
