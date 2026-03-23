import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { logger } from "../lib/logger";

interface AuditEntry {
  workspaceId?: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

/**
 * Fire-and-forget audit log entry.
 * Never throws — failures are silently logged to stderr.
 */
export function audit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        workspaceId: entry.workspaceId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? undefined,
        ip: entry.ip,
      },
    })
    .catch((err) => {
      logger.error({ err: err?.message }, "Failed to write audit log");
    });
}
