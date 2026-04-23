import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Avatar color ──────────────────────────────────────────────
const AVATAR_COLORS = [
  "#0073EA",
  "#A25DDC",
  "#00C875",
  "#579BFC",
  "#FDAB3D",
  "#E2445C",
  "#FF642E",
  "#66CCFF",
  "#4ECCC6",
  "#CAB641",
];

/** Generate a consistent avatar background color from a name string. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Relative time formatting (Hebrew) ─────────────────────────
/** Return a human-readable Hebrew relative-time string for a date. */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // Compare calendar days, not raw milliseconds, to avoid off-by-one errors
  // when the date is less than 24h in the future/past.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 1) return "מחר";
    return `בעוד ${futureDays} ימים`;
  }

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

// ── Minute-granularity relative time (Hebrew) ────────────────
/** Return a Hebrew relative-time string with minute/hour/day granularity. */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();

  // Future dates: return a forward-looking string instead of "עכשיו"
  if (diff < 0) {
    const futureMins = Math.floor(Math.abs(diff) / 60000);
    if (futureMins < 1) return "עכשיו";
    if (futureMins < 60) return `בעוד ${futureMins} דק'`;
    const futureHours = Math.floor(futureMins / 60);
    if (futureHours < 24) return `בעוד ${futureHours} שע'`;
    const futureDays = Math.floor(futureHours / 24);
    if (futureDays === 1) return "מחר";
    if (futureDays < 7) return `בעוד ${futureDays} ימים`;
    return new Date(dateStr).toLocaleDateString("he-IL");
  }

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(dateStr).toLocaleDateString("he-IL");
}

// ── Mutation error handler ────────────────────────────────────
/**
 * Walk every error shape our code can produce and extract a displayable
 * string message.
 *
 * Our api client (see src/api/client.ts) throws plain `{ code, message }`
 * objects — NOT Error instances — so a naive `err instanceof Error` check
 * misses the real server message. This helper handles:
 *   - string
 *   - Error instance
 *   - `{ message }`
 *   - `{ error: { message } }`
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: unknown; error?: { message?: unknown } };
    if (typeof e.message === "string" && e.message) return e.message;
    if (e.error && typeof e.error.message === "string" && e.error.message) return e.error.message;
  }
  return fallback;
}

/**
 * Standard onError handler for react-query mutations. Surfaces the real
 * server error message to the user via toast, falling back to a generic
 * Hebrew message if none can be extracted.
 */
export function handleMutationError(err: unknown, fallback = "שגיאה לא צפויה"): void {
  const message = extractErrorMessage(err, fallback);
  toast.error(message);
}
