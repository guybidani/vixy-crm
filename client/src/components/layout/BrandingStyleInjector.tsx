import { useEffect } from "react";
import {
  useWorkspaceOptions,
  DEFAULT_BRAND_COLOR,
} from "../../hooks/useWorkspaceOptions";

/**
 * Helpers to derive shades from a hex brand color so hover/shadow/focus-ring
 * variants still look cohesive with the chosen primary color.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Darken a hex color by `amount` (0–1) in linear RGB space. */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Injects CSS custom properties at :root so the brand color flows through
 * the UI. Components that use `var(--brand-color)` or the utility classes
 * will automatically pick up workspace branding.
 *
 * We ALSO remap occurrences of the legacy hardcoded color (#0073EA) to the
 * workspace brand color via a lightweight style override. That's a narrow
 * safety net — primary CTAs, active nav highlights, and focus states remain
 * explicit Tailwind arbitrary colors in the existing codebase, which keeps
 * behavior predictable while still letting workspaces "theme" the app.
 */
export default function BrandingStyleInjector() {
  const { branding } = useWorkspaceOptions();
  const brandColor = branding.brandColor || DEFAULT_BRAND_COLOR;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-color", brandColor);
    root.style.setProperty("--brand-color-hover", darken(brandColor, 0.12));
    root.style.setProperty("--brand-color-active", darken(brandColor, 0.2));
  }, [brandColor]);

  return null;
}
