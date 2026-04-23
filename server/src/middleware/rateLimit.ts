import rateLimit from "express-rate-limit";

// NOTE(single-instance): These limiters use the default in-memory store. Each
// replica tracks its own counters, so horizontally scaling past one container
// would let a client multiply its allowance by the replica count. We deploy as
// a single Coolify container today so this is acceptable. If we scale out, add
// `rate-limit-redis` and back the store with `redisConnection` from
// queue/connection.ts — the Redis/ioredis connection is already available.

/**
 * Strict rate limit for authentication endpoints (login, register, refresh).
 * Prevents brute-force attacks and credential stuffing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // 15 attempts per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many attempts. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email (if present) to prevent distributed attacks
    const email = req.body?.email || "";
    const rawIp = req.ip || req.socket.remoteAddress || "unknown";
    // Normalize IPv6-mapped IPv4 addresses (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
    const ip = rawIp.replace(/^::ffff:/, "");
    return `${ip}:${email}`;
  },
  validate: { keyGeneratorIpFallback: false },
});

/**
 * General API rate limit — generous but prevents abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200, // 200 requests per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please slow down.",
    },
  },
});

/**
 * Strict rate limit for AI endpoints — streaming completions are expensive
 * (each call fans out to a paid LLM provider). Applied on top of apiLimiter.
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 20, // 20 AI calls per minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many AI requests. Please wait a moment.",
    },
  },
});

/**
 * Strict rate limit for bulk import / export endpoints — each call can
 * touch thousands of rows and holds DB connections for a while.
 */
export const heavyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // 10 heavy operations per 5 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many bulk operations. Please wait a few minutes.",
    },
  },
});
