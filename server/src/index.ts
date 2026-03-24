import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { router } from "./routes";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./db/client";
import { redisConnection } from "./queue/connection";
import { registerFollowUpScheduler } from "./queue/followup.queue";
import { followUpWorker, setWorkerIO } from "./queue/followup.worker";
import {
  automationWorker,
  setAutomationWorkerIO,
} from "./queue/automation.worker";
import { reminderWorker, setReminderWorkerIO } from "./queue/reminder.worker";
import { registerDigestScheduler } from "./queue/digest.queue";
import { digestWorker, setDigestWorkerIO } from "./queue/digest.worker";
import { logger } from "./lib/logger";

// ─── Socket.io Security: Per-user connection tracking ───
const MAX_CONNECTIONS_PER_USER = 5;
const userConnectionCount = new Map<string, number>();

// ─── Socket.io Security: Per-event rate limiting ───
const socketRateLimits: Record<string, { limit: number; windowMs: number }> = {
  "join-workspace": { limit: 10, windowMs: 60_000 }, // 10 joins/min
};
const socketRateWindows = new Map<string, { count: number; resetAt: number }>();

function checkSocketRateLimit(socketId: string, event: string): boolean {
  const rule = socketRateLimits[event];
  if (!rule) return true;
  const key = `${socketId}:${event}`;
  const now = Date.now();
  const window = socketRateWindows.get(key);
  if (!window || now > window.resetAt) {
    socketRateWindows.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  window.count++;
  return window.count <= rule.limit;
}

const app = express();
const httpServer = createServer(app);

// Socket.io with payload size limit
const io = new SocketServer(httpServer, {
  cors: { origin: config.corsOrigin, credentials: true },
  maxHttpBufferSize: 100_000, // 100KB
});

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", config.corsOrigin, "wss://*.projectadam.co.il", "https://*.projectadam.co.il", "https://accounts.google.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["https://accounts.google.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading cross-origin images
  }),
);

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(
  express.json({
    limit: "1mb",
    // Preserve raw body for webhook HMAC signature verification
    verify: (req: any, _res, buf) => {
      if (
        req.url?.startsWith("/api/v1/vixy/webhook") ||
        req.url?.startsWith("/api/v1/kolio/webhook")
      ) {
        req.rawBody = buf.toString("utf8");
      }
    },
  }),
);
app.use(apiLimiter);

// Make io available to routes
app.set("io", io);

// Authenticated file serving for uploads (no public static access)
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
app.get("/uploads/:filename", requireAuth, (req, res) => {
  const filename = req.params.filename as string;
  // Path traversal protection: only allow simple filenames (UUID-style)
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({
      error: { code: "INVALID_FILENAME", message: "Invalid filename" },
    });
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  // Ensure resolved path stays within uploads directory
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return res
      .status(403)
      .json({ error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  res.sendFile(filePath, (err) => {
    if (err)
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "File not found" } });
  });
});

// Routes
app.use("/api/v1", router);

// Health check (deep — DB + Redis)
app.get("/health", async (_req, res) => {
  const result: Record<string, string> = {
    status: "ok",
    db: "ok",
    redis: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch {
    result.status = "degraded";
    result.db = "error";
  }

  try {
    const pong = await redisConnection.ping();
    if (pong !== "PONG") {
      result.status = "degraded";
      result.redis = "error";
    }
  } catch {
    result.status = "degraded";
    result.redis = "error";
  }

  const httpStatus = result.status === "ok" ? 200 : 503;
  res.status(httpStatus).json(result);
});

// In production, serve the Vite client build from ../public
if (config.nodeEnv === "production") {
  const clientDir = path.resolve(__dirname, "../public");
  app.use(express.static(clientDir));
  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/socket.io/") ||
      req.path.startsWith("/uploads/")
    ) {
      return next();
    }
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

// Error handler (must be last)
app.use(errorHandler);

// ─── Socket.io JWT Authentication Middleware ───
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as {
      userId: string;
      email: string;
    };
    // Per-user connection limit
    const current = userConnectionCount.get(payload.userId) || 0;
    if (current >= MAX_CONNECTIONS_PER_USER) {
      return next(new Error("Too many connections"));
    }
    socket.data.userId = payload.userId;
    socket.data.email = payload.email;
    userConnectionCount.set(payload.userId, current + 1);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id} (user: ${socket.data.userId})`);

  socket.on("join-workspace", async (workspaceId: string) => {
    if (typeof workspaceId !== "string") return;
    // Rate limit join events
    if (!checkSocketRateLimit(socket.id, "join-workspace")) {
      socket.emit("error", { message: "Too many join requests" });
      return;
    }
    // Verify user is a member of this workspace
    try {
      const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: socket.data.userId },
      });
      if (!membership) {
        socket.emit("error", { message: "Not a member of this workspace" });
        return;
      }
      socket.join(`workspace:${workspaceId}`);
    } catch (err) {
      logger.error(`Socket workspace join error: ${err}`);
    }
  });

  socket.on("disconnect", () => {
    // Decrement per-user connection count
    const userId = socket.data.userId;
    if (userId) {
      const count = userConnectionCount.get(userId) || 0;
      if (count <= 1) {
        userConnectionCount.delete(userId);
      } else {
        userConnectionCount.set(userId, count - 1);
      }
    }
    // Clean up rate-limit entries for this socket
    for (const key of socketRateWindows.keys()) {
      if (key.startsWith(`${socket.id}:`)) {
        socketRateWindows.delete(key);
      }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(config.port, async () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);

  // Initialize BullMQ follow-up scheduler
  try {
    setWorkerIO(io);
    setAutomationWorkerIO(io);
    setReminderWorkerIO(io);
    setDigestWorkerIO(io);
    await registerFollowUpScheduler();
    await registerDigestScheduler();
    logger.info("Follow-up automation scheduler registered");
    logger.info("Automation workflow worker started");
    logger.info("Task reminder worker started");
    logger.info("Daily digest scheduler registered");
  } catch (err) {
    logger.warn(
      "Failed to initialize follow-up scheduler (Redis may be unavailable)",
    );
  }
});

// ─── Periodic cleanup of expired socket rate-limit entries (every 5 min) ───
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, window] of socketRateWindows) {
    if (now > window.resetAt) {
      socketRateWindows.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ─── Graceful Shutdown ───
async function shutdown() {
  logger.info("Shutting down gracefully...");
  clearInterval(rateLimitCleanupInterval);

  // Stop accepting new connections
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await new Promise<void>((resolve) => { io.close(() => resolve()); });

  // Close all BullMQ workers
  await Promise.allSettled([
    followUpWorker.close(),
    automationWorker.close(),
    reminderWorker.close(),
    digestWorker.close(),
  ]);

  // Disconnect Prisma
  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app, io };
