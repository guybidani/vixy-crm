import { Request, Response, NextFunction } from "express";
import pino from "pino";
import { config } from "../config";

const logger = pino({
  transport:
    config.nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
});

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        // Only include details in development — prevents internal data leaks in production
        ...(config.nodeEnv === "development" && err.details
          ? { details: err.details }
          : {}),
      },
    });
  }

  // Log the full error with pino (includes stack trace for debugging)
  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
  });
}
