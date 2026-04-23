import { useEffect } from "react";

interface UseDetailPanelNavigationOptions<T extends { id: string }> {
  /** Ordered list of items currently visible in the list (filtered/sorted). */
  items: T[];
  /** Id of the item whose detail panel is currently open, or null. */
  currentId: string | null;
  /** Called with the next/previous item's id when J/K is pressed. */
  onSelect: (id: string) => void;
  /** When false, the listener is not registered. Defaults to true. */
  enabled?: boolean;
}

/**
 * J/K keyboard navigation for detail panels.
 *
 * When a detail panel is open (`currentId` is set), pressing `J` advances to
 * the next item in `items` and `K` moves to the previous one. The list wraps
 * around, so pressing `J` on the last item jumps back to the first.
 *
 * The shortcut is suppressed while the user is typing into an input, textarea,
 * select, or contentEditable surface — same behaviour as our global
 * shortcut handler's `isEditingContext()`.
 *
 * Modifier keys (Ctrl / Meta / Alt) disable the shortcut so we don't clobber
 * browser-level or app-level chords.
 */
export function useDetailPanelNavigation<T extends { id: string }>({
  items,
  currentId,
  onSelect,
  enabled = true,
}: UseDetailPanelNavigationOptions<T>): void {
  useEffect(() => {
    if (!enabled || !currentId) return;
    if (items.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when modifier keys are held.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Don't fire while the user is typing in a form field / editor.
      const el = document.activeElement as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (el.isContentEditable) return;
      }

      // Only react to plain j / k (case-insensitive, no shift).
      const key = e.key;
      if (key !== "j" && key !== "J" && key !== "k" && key !== "K") return;

      const idx = items.findIndex((i) => i.id === currentId);
      if (idx === -1) return;

      e.preventDefault();
      if (key === "j" || key === "J") {
        const next = items[(idx + 1) % items.length];
        onSelect(next.id);
      } else {
        const prev = items[(idx - 1 + items.length) % items.length];
        onSelect(prev.id);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, currentId, onSelect, enabled]);
}
