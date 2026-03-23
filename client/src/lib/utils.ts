import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Avatar color ──────────────────────────────────────────────
const AVATAR_COLORS = [
  "#6161FF",
  "#A25DDC",
  "#00CA72",
  "#579BFC",
  "#FDAB3D",
  "#FB275D",
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
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return "היום";
    if (futureDays === 1) return "מחר";
    return `בעוד ${futureDays} ימים`;
  }

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

// ── Mutation error handler ────────────────────────────────────
/** Standard onError handler for react-query mutations. */
export function handleMutationError(err: unknown, fallback = "שגיאה בביצוע הפעולה") {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
}
