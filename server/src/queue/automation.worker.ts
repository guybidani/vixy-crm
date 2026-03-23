import { Worker } from "bullmq";
import { redisConnection } from "./connection";
import { processTrigger } from "../services/automation.service";
import type { AutomationJobData } from "./automation.queue";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger";

let ioRef: SocketServer | null = null;

export function setAutomationWorkerIO(io: SocketServer) {
  ioRef = io;
}

export const automationWorker = new Worker(
  "automation-triggers",
  async (job) => {
    const data = job.data as AutomationJobData;
    await processTrigger({
      workspaceId: data.workspaceId,
      entityType: data.entityType,
      entityId: data.entityId,
      trigger: data.trigger,
      data: data.data,
      previousData: data.previousData,
    });

    // Emit real-time notification update to workspace
    if (ioRef) {
      ioRef
        .to(`workspace:${data.workspaceId}`)
        .emit("notification:new", { trigger: data.trigger });
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

automationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Automation job failed");
});

automationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Automation job completed");
});
