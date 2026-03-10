import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const automationQueue = new Queue("automation-triggers", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export interface AutomationJobData {
  workspaceId: string;
  trigger: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  previousData?: Record<string, any>;
}

export async function enqueueAutomationTrigger(jobData: AutomationJobData) {
  await automationQueue.add("process-trigger", jobData, {
    priority: 1,
  });
}
