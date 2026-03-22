import rateLimit from "express-rate-limit";

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
