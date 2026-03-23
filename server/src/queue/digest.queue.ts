import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const digestQueue = new Queue("daily-digest", {
  connection: redisConnection,
});

export async function registerDigestScheduler() {
  await digestQueue.upsertJobScheduler(
    "daily-digest",
    {
      pattern: "0 8 * * 0-4", // 8AM Sun-Thu (Israeli work week)
      tz: "Asia/Jerusalem",
    },
    { name: "daily-digest" },
  );
}
