import { useQuery } from "@tanstack/react-query";
import { getSnoozeOptions, type SnoozeOption } from "../api/settings";
import { useAuth } from "./useAuth";

export type { SnoozeOption };

export const DEFAULT_SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "שעה", minutes: 60 },
  { label: "שעתיים", minutes: 120 },
  { label: "4 שעות", minutes: 240 },
  { label: "מחר בבוקר", minutes: -1, special: "tomorrow_9am" },
  { label: "עוד שבוע בבוקר", minutes: -1, special: "next_sunday_9am" },
];

/**
 * Returns workspace-configured snooze options, falling back to defaults.
 * The SnoozeDropdown component should use this hook to render options.
 */
export function useSnoozeOptions() {
  const { currentWorkspaceId, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["snooze-options", currentWorkspaceId],
    queryFn: getSnoozeOptions,
    enabled: !!currentWorkspaceId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    snoozeOptions: data?.snoozeOptions ?? DEFAULT_SNOOZE_OPTIONS,
    isLoading,
  };
}

/**
 * Resolve a snooze option to a concrete Date.
 * - Regular options: adds `minutes` to `now`.
 * - Special "tomorrow_9am": next day at 09:00 local time.
 * - Special "next_sunday_9am": next Sunday at 09:00 local time.
 * - Custom minutes: pass any positive number.
 */
export function resolveSnoozeDate(
  option: Pick<SnoozeOption, "minutes" | "special">,
): Date {
  const now = new Date();

  if (option.special === "tomorrow_9am") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  if (option.special === "next_sunday_9am") {
    const d = new Date(now);
    const dayOfWeek = d.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  // Regular: add minutes
  return new Date(now.getTime() + option.minutes * 60 * 1000);
}
