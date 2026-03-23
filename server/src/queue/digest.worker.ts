import { Worker } from "bullmq";
import { redisConnection } from "./connection";
import { prisma } from "../db/client";
import type { Server as SocketServer } from "socket.io";
import { sendDigestEmail } from "../services/email.service";
import { logger } from "../lib/logger";
import { SEVEN_DAYS_MS } from "../lib/constants";

let ioRef: SocketServer | null = null;

export function setDigestWorkerIO(io: SocketServer) {
  ioRef = io;
}

export const digestWorker = new Worker(
  "daily-digest",
  async () => {
    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
    });

    for (const ws of workspaces) {
      try {
        await processWorkspaceDigest(ws.id);
      } catch (err) {
        logger.error(
          { workspaceId: ws.id, err: err instanceof Error ? err.message : err },
          "Digest failed for workspace",
        );
        // Continue to next workspace
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

async function processWorkspaceDigest(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true } } },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  for (const member of members) {
    try {
      await processMemberDigest(
        workspaceId,
        member.id,
        member.user.id,
        member.user.email,
        todayStart,
        todayEnd,
        sevenDaysAgo,
      );
    } catch (err) {
      logger.error(
        { memberId: member.id, err: err instanceof Error ? err.message : err },
        "Digest failed for member",
      );
      // Continue to next member
    }
  }
}

async function processMemberDigest(
  workspaceId: string,
  memberId: string,
  userId: string,
  userEmail: string,
  todayStart: Date,
  todayEnd: Date,
  sevenDaysAgo: Date,
) {
  const [todayTasksCount, overdueTasksCount, staleDealsCount, firstUpcomingTask] =
    await Promise.all([
      // Tasks due today, not done
      prisma.task.count({
        where: {
          workspaceId,
          assigneeId: memberId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Overdue tasks (dueDate < today start, not done)
      prisma.task.count({
        where: {
          workspaceId,
          assigneeId: memberId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: todayStart },
        },
      }),

      // Deals with no activity in 7+ days (assigned to this member)
      prisma.deal.count({
        where: {
          workspaceId,
          assigneeId: memberId,
          stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
          OR: [
            { lastActivityAt: { lt: sevenDaysAgo } },
            { lastActivityAt: null, updatedAt: { lt: sevenDaysAgo } },
          ],
        },
      }),

      // First upcoming task today (with time, ordered earliest first)
      prisma.task.findFirst({
        where: {
          workspaceId,
          assigneeId: memberId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: [{ dueTime: "asc" }, { dueDate: "asc" }],
        select: { title: true, dueTime: true },
      }),
    ]);

  // Skip if there's nothing to report
  if (
    todayTasksCount === 0 &&
    overdueTasksCount === 0 &&
    staleDealsCount === 0
  ) {
    return;
  }

  // Build notification text
  const title = `סיכום יומי: ${todayTasksCount} משימות להיום, ${overdueTasksCount} באיחור`;

  const bodyParts: string[] = [];
  if (firstUpcomingTask) {
    const timeStr = firstUpcomingTask.dueTime || "ללא שעה";
    bodyParts.push(`המשימה הראשונה: ${firstUpcomingTask.title} ב-${timeStr}`);
  }
  if (staleDealsCount > 0) {
    bodyParts.push(`${staleDealsCount} עסקאות דורשות תשומת לב`);
  }
  const body = bodyParts.join("\n") || undefined;

  await prisma.notification.create({
    data: {
      workspaceId,
      userId,
      type: "DAILY_DIGEST",
      title,
      body,
      isRead: false,
    },
  });

  // Send digest email (fire-and-forget)
  sendDigestEmail(userEmail, {
    todayTasks: todayTasksCount,
    overdueTasks: overdueTasksCount,
    staleDeals: staleDealsCount,
    nextTaskTitle: firstUpcomingTask?.title,
  }).catch((err) => logger.error({ err }, "Digest email failed"));

  // Emit real-time event
  if (ioRef) {
    ioRef.to(`workspace:${workspaceId}`).emit("daily-digest", {
      userId,
      title,
      body,
    });
  }
}

digestWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Digest job failed");
});
