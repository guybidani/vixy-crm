import { Worker } from "bullmq";
import { redisConnection } from "./connection";
import { prisma } from "../db/client";
import type { Server as SocketServer } from "socket.io";

let ioRef: SocketServer | null = null;

export function setReminderWorkerIO(io: SocketServer) {
  ioRef = io;
}

export const reminderWorker = new Worker(
  "task-reminders",
  async (job) => {
    const { taskId, workspaceId, memberId, taskTitle, dueDateTime, dueTime } =
      job.data;

    // Fetch the member to get their userId
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true } } },
    });

    if (!member) return;

    // Persist an in-app notification
    await prisma.notification.create({
      data: {
        workspaceId,
        userId: member.user.id,
        type: "TASK_DUE",
        title: "תזכורת משימה",
        body: `המשימה "${taskTitle}" אמורה להתבצע בשעה ${dueTime}`,
        entityType: "task",
        entityId: taskId,
        isRead: false,
      },
    });

    // Emit real-time event to the whole workspace room
    if (ioRef) {
      ioRef.to(`workspace:${workspaceId}`).emit("task-reminder", {
        taskId,
        taskTitle,
        dueDateTime,
        dueTime,
        memberId,
        message: `תזכורת: "${taskTitle}" - ${dueTime}`,
      });
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

reminderWorker.on("failed", (job, err) => {
  console.error(`Reminder job ${job?.id} failed:`, err.message);
});
