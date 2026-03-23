import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import pino from "pino";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { router } from "./routes";
import { requireAuth } from "./middleware/auth";
import { prisma } from "./db/client";
import { registerFollowUpScheduler } from "./queue/followup.queue";
import { followUpWorker, setWorkerIO } from "./queue/followup.worker";
import {
  automationWorker,
  setAutomationWorkerIO,
} from "./queue/automation.worker";
import { reminderWorker, setReminderWorkerIO } from "./queue/reminder.worker";
import { registerDigestScheduler } from "./queue/digest.queue";
import { digestWorker, setDigestWorkerIO } from "./queue/digest.worker";

const logger = pino({
  transport:
    config.nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
});

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
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", config.corsOrigin],
        fontSrc: ["'self'"],
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
      if (req.url?.startsWith("/api/v1/vixy/webhook")) {
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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

export { app, io };
