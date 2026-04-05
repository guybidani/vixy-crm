import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";

// Validate critical secrets in production
if (nodeEnv === "production") {
  const required = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "CORS_ORIGIN",
    "DATABASE_URL",
    "REDIS_URL",
    "ENCRYPTION_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}`,
    );
  }
  // Enforce minimum secret strength (32 chars)
  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    if (process.env[key]!.length < 32) {
      throw new Error(`${key} must be at least 32 characters in production`);
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/vixy_crm",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },
  vixy: {
    apiUrl: process.env.VIXY_API_URL || "",
    apiKey: process.env.VIXY_API_KEY || "",
    webhookSecret: process.env.VIXY_WEBHOOK_SECRET || "",
  },
  kolio: {
    webhookSecret: process.env.KOLIO_WEBHOOK_SECRET || "",
  },
  cookie: {
    secure: nodeEnv === "production",
    sameSite: (nodeEnv === "production" ? "strict" : "lax") as "strict" | "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  encryptionKey:
    process.env.ENCRYPTION_KEY ||
    "0000000000000000000000000000000000000000000000000000000000000000",
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@projectadam.co.il",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    oauthRedirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      "http://localhost:3001/api/v1/calendar/callback",
  },
  ai: {
    enabled: process.env.AI_ENABLED === "true",
    provider: (process.env.AI_PROVIDER || "ollama") as "ollama" | "google",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    ollamaModel: process.env.OLLAMA_MODEL || "gemma4:12b",
    googleApiKey: process.env.GOOGLE_AI_API_KEY || "",
    googleModel: process.env.GOOGLE_AI_MODEL || "gemma-4-27b-it",
  },
} as const;
