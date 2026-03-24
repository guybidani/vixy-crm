/**
 * Shared avatar utility — single source of truth for avatar background colors.
 * Import `getAvatarColor` wherever you need a consistent color from a name.
 *
 * Re-exported from lib/utils as `avatarColor` for backwards compatibility.
 */

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

/** Return a stable background color string derived from a display name. */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Alias kept for parity with lib/utils export. */
export const avatarColor = getAvatarColor;

/** Return up to 2 uppercase initials from a display name. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
