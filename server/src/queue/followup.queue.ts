import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const followUpQueue = new Queue("followup-checker", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function registerFollowUpScheduler() {
  // Add a repeatable job that runs every 5 minutes
  await followUpQueue.upsertJobScheduler(
    "check-due-executions",
    { every: 5 * 60 * 1000 },
    { name: "check-due-executions" },
  );
}
