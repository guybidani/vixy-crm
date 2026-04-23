/**
 * Canonical Monday.com label/status color palette.
 *
 * Use this as the single source of truth for:
 *   - Status pill colors
 *   - Priority badge colors
 *   - Color pickers (OptionsTab, MondayStatusCell edit mode)
 *   - Default stage/status seed values
 *
 * Imported into both `client/src/lib/constants.ts` (defaults) and into
 * components that render color pickers so all swatches stay identical.
 */

// ── Named colors ─────────────────────────────────────────

export const MONDAY_COLORS = {
  green: "#00C875",
  darkGreen: "#037F4C",
  olive: "#9CD326",
  mint: "#76E4A5",
  yellow: "#FDAB3D",
  orange: "#FF642E",
  red: "#E2445C",
  lipstick: "#FF158A",
  pink: "#CF5DE1",
  purple: "#A25DDC",
  lavender: "#784BD1",
  darkBlue: "#579BFC",
  chiliBlue: "#225091",
  teal: "#2EBCFB",
  aquamarine: "#5DDBBE",
  brown: "#8C9B6F",
  gray: "#808080",
  lightGray: "#C4C4C4",
  // Legacy tokens still referenced by a handful of older screens
  deepBlue: "#0073EA",
  softBlue: "#66CCFF",
} as const;

// ── Priority tokens ──────────────────────────────────────

export const PRIORITY_COLORS = {
  URGENT: MONDAY_COLORS.red, // #E2445C
  HIGH: MONDAY_COLORS.orange, // #FF642E
  MEDIUM: MONDAY_COLORS.darkBlue, // #579BFC
  LOW: "#C5C7D0", // Monday's "Low" gray
} as const;

// ── Lead heat tokens ─────────────────────────────────────

export const LEAD_HEAT_COLORS = {
  HOT: MONDAY_COLORS.red, // #E2445C
  WARM: MONDAY_COLORS.orange, // #FF642E
  LUKEWARM: MONDAY_COLORS.yellow, // #FDAB3D
  COLD: MONDAY_COLORS.darkBlue, // #579BFC
  FROZEN: MONDAY_COLORS.gray, // #808080
} as const;

// ── Palette list (order used by color pickers) ───────────

export const MONDAY_PALETTE: string[] = [
  MONDAY_COLORS.green,
  MONDAY_COLORS.darkGreen,
  MONDAY_COLORS.olive,
  MONDAY_COLORS.mint,
  MONDAY_COLORS.yellow,
  MONDAY_COLORS.orange,
  MONDAY_COLORS.red,
  MONDAY_COLORS.lipstick,
  MONDAY_COLORS.pink,
  MONDAY_COLORS.purple,
  MONDAY_COLORS.lavender,
  MONDAY_COLORS.darkBlue,
  MONDAY_COLORS.chiliBlue,
  MONDAY_COLORS.teal,
  MONDAY_COLORS.aquamarine,
  MONDAY_COLORS.brown,
  MONDAY_COLORS.gray,
  MONDAY_COLORS.lightGray,
];
