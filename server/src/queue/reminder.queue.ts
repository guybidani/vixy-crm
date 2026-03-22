import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const reminderQueue = new Queue("task-reminders", {
  connection: redisConnection,
});

export async function scheduleTaskReminder(
  taskId: string,
  workspaceId: string,
  memberId: string,
  taskTitle: string,
  dueDate: Date,
  dueTime: string, // "HH:mm"
  reminderMinutes: number,
) {
  // Combine dueDate date portion with dueTime
  const [hours, minutes] = dueTime.split(":").map(Number);
  const dueDateTime = new Date(dueDate);
  dueDateTime.setHours(hours, minutes, 0, 0);

  const fireAt = new Date(dueDateTime.getTime() - reminderMinutes * 60 * 1000);
  const delay = Math.max(0, fireAt.getTime() - Date.now());

  // Remove any existing reminder for this task (by jobId)
  try {
    const existing = await reminderQueue.getJob(`reminder-${taskId}`);
    if (existing) await existing.remove();
  } catch {
    // ignore – job may not exist
  }

  await reminderQueue.add(
    "task-due",
    {
      taskId,
      workspaceId,
      memberId,
      taskTitle,
      dueDateTime: dueDateTime.toISOString(),
      dueTime,
    },
    {
      delay,
      jobId: `reminder-${taskId}`,
    },
  );
}

export async function cancelTaskReminder(taskId: string) {
  try {
    const job = await reminderQueue.getJob(`reminder-${taskId}`);
    if (job) await job.remove();
  } catch {
    // ignore if not found
  }
}
