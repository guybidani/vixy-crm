import pino from "pino";
import { config } from "../config";

export const logger = pino({
  transport:
    config.nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
});
