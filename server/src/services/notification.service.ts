import { prisma } from "../db/client";
import { sendNotificationEmail } from "./email.service";

interface CreateNotificationData {
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}

const EMAIL_WORTHY_TYPES = new Set([
  "TASK_ASSIGNED",
  "TASK_DUE",
  "TICKET_UPDATE",
]);

export async function create(data: CreateNotificationData) {
  const notification = await prisma.notification.create({
    data: {
      workspaceId: data.workspaceId,
      userId: data.userId,
      type: data.type as any,
      title: data.title,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
    },
  });

  // Fire-and-forget email for important notification types
  if (EMAIL_WORTHY_TYPES.has(data.type)) {
    prisma.user
      .findUnique({ where: { id: data.userId }, select: { email: true } })
      .then((user) => {
        if (user?.email) {
          sendNotificationEmail(user.email, {
            title: data.title,
            body: data.body,
            entityType: data.entityType,
            entityId: data.entityId,
          }).catch((err) =>
            console.error("Notification email failed:", err),
          );
        }
      })
      .catch((err) =>
        console.error("Failed to fetch user for notification email:", err),
      );
  }

  return notification;
}

export async function createForWorkspace(
  workspaceId: string,
  data: Omit<CreateNotificationData, "workspaceId" | "userId">,
) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
  });

  return prisma.notification.createMany({
    data: members.map((m) => ({
      workspaceId,
      userId: m.userId,
      type: data.type as any,
      title: data.title,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
    })),
  });
}

export async function list(
  workspaceId: string,
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
) {
  const { limit = 50, offset = 0, unreadOnly = false } = opts;

  const where: any = { workspaceId, userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { workspaceId, userId, isRead: false },
    }),
  ]);

  return { data: notifications, total, unreadCount };
}

export async function getUnreadCount(workspaceId: string, userId: string) {
  return prisma.notification.count({
    where: { workspaceId, userId, isRead: false },
  });
}

export async function markRead(
  workspaceId: string,
  userId: string,
  notificationId: string,
) {
  return prisma.notification.updateMany({
    where: { id: notificationId, workspaceId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(workspaceId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { workspaceId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function remove(
  workspaceId: string,
  userId: string,
  notificationId: string,
) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, workspaceId, userId },
  });
}
