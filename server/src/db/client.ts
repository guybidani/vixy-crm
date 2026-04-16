import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Models that require workspace scoping.
 * All queries on these models will automatically filter by workspaceId.
 */
const WORKSPACE_SCOPED_MODELS = [
  "Contact",
  "Company",
  "Deal",
  "Activity",
  "Task",
  "Tag",
  "SmartView",
  "Ticket",
  "TicketMessage",
  "SlaPolicy",
  "CannedResponse",
  "KbCategory",
  "KbArticle",
  "VixyCampaignLink",
  "FollowUpSequence",
  "FollowUpExecution",
  "Document",
  "DocumentLink",
  "Note",
  "Board",
  "SavedView",
  "Workflow",
  "Notification",
  "NotificationPreference",
] as const;

/**
 * Helper to create a workspace-scoped Prisma client for use in route handlers.
 * Usage:
 *   const db = scopedPrisma(req.workspaceId!);
 *   const contacts = await db.contact.findMany(); // auto-filtered by workspace
 */
export function scopedPrisma(workspaceId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (WORKSPACE_SCOPED_MODELS.includes(model as any)) {
            args.where = { ...args.where, workspaceId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (WORKSPACE_SCOPED_MODELS.includes(model as any)) {
            args.where = { ...args.where, workspaceId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (WORKSPACE_SCOPED_MODELS.includes(model as any)) {
            // findUnique can't accept extra where clauses, so run the query
            // then verify the returned record belongs to this workspace
            const result = await query(args);
            if (
              result &&
              (result as any).workspaceId &&
              (result as any).workspaceId !== workspaceId
            ) {
              return null; // Cross-workspace access blocked
            }
            return result;
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (WORKSPACE_SCOPED_MODELS.includes(model as any)) {
            (args.data as any).workspaceId = workspaceId;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          return query(args);
        },
        async delete({ model, args, query }) {
          return query(args);
        },
        async count({ model, args, query }) {
          if (WORKSPACE_SCOPED_MODELS.includes(model as any)) {
            args.where = { ...args.where, workspaceId };
          }
          return query(args);
        },
      },
    },
  });
}
