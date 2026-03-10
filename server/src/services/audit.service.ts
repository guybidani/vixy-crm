import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";

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
      // eslint-disable-next-line no-console
      console.error("[audit] Failed to write audit log:", err?.message);
    });
}
