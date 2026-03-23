import { Queue } from "bullmq";
import { redisConnection } from "./connection";
import { FIVE_MINUTES_MS } from "../lib/constants";

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
    { every: FIVE_MINUTES_MS },
    { name: "check-due-executions" },
  );
}
