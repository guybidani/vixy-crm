import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

type QuickAddType = "task" | "contact" | "deal" | "ticket";

interface UseKeyboardShortcutsOptions {
  onQuickAdd: (type?: QuickAddType) => void;
}

interface UseKeyboardShortcutsReturn {
  showShortcutsHelp: boolean;
  toggleShortcutsHelp: () => void;
  closeShortcutsHelp: () => void;
}

/**
 * Returns true when the user is actively typing into an input/textarea/select,
 * a contentEditable surface, or when any non-shortcuts dialog is open.
 *
 * The ShortcutsHelp dialog itself is whitelisted so `?` can still toggle it
 * closed even though it renders with role="dialog".
 */
function isEditingContext(): boolean {
  const el = document.activeElement;
  if (el) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if ((el as HTMLElement).isContentEditable) return true;
  }
  // If any dialog other than our own shortcuts help is open, don't fire shortcuts.
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const d of dialogs) {
    if (d.getAttribute("aria-label") !== "קיצורי מקלדת") return true;
  }
  return false;
}

const CHORD_TIMEOUT = 800;

// G-chord: navigate to a route.
const GOTO_CHORD_MAP: Record<string, string> = {
  d: "/dashboard",
  c: "/contacts",
  e: "/deals",
  t: "/tasks",
  k: "/tickets",
  s: "/settings",
};

// N-chord: create a new item of a given type.
const NEW_CHORD_MAP: Record<string, QuickAddType> = {
  c: "contact",
  d: "deal",
  t: "task",
  k: "ticket",
};

type PendingChord = "g" | "n" | null;

export const OPEN_SHORTCUTS_EVENT = "vixy:open-shortcuts";

export function useKeyboardShortcuts({
  onQuickAdd,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsReturn {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const navigate = useNavigate();
  const chordPendingRef = useRef<PendingChord>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordPendingRef.current = null;
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  const startChord = useCallback(
    (chord: PendingChord) => {
      clearChord();
      chordPendingRef.current = chord;
      chordTimerRef.current = setTimeout(() => {
        chordPendingRef.current = null;
        chordTimerRef.current = null;
      }, CHORD_TIMEOUT);
    },
    [clearChord],
  );

  const toggleShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp((prev) => !prev);
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(false);
  }, []);

  // Expose an app-wide event so UI chrome (e.g. the `?` button inside
  // MondayBoard's toolbar) can open the dialog without needing a prop drill.
  useEffect(() => {
    function handleOpen() {
      setShowShortcutsHelp((prev) => !prev);
    }
    window.addEventListener(OPEN_SHORTCUTS_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SHORTCUTS_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // `?` = toggle this dialog. On most layouts this is Shift+/, so we
      // handle it up-front BEFORE the modifier-key bailout below. When the
      // dialog itself is already open we still allow `?` to close it, since
      // isEditingContext() whitelists our own dialog.
      if (e.key === "?") {
        if (isEditingContext()) return;
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      // Never intercept when modifier keys are held (we already handled `?`).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape: close the shortcuts help if it's open. Other dialogs manage
      // their own Escape handling.
      if (e.key === "Escape") {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          e.preventDefault();
        }
        clearChord();
        return;
      }

      // Don't fire shortcuts when the user is typing in an input / editing.
      if (isEditingContext()) return;

      const key = e.key.toLowerCase();

      // Handle the 2nd key of a chord.
      if (chordPendingRef.current) {
        const pending = chordPendingRef.current;
        clearChord();
        if (pending === "g") {
          const route = GOTO_CHORD_MAP[key];
          if (route) {
            e.preventDefault();
            navigate(route);
          }
          return;
        }
        if (pending === "n") {
          const type = NEW_CHORD_MAP[key];
          if (type) {
            e.preventDefault();
            onQuickAdd(type);
          }
          return;
        }
        return;
      }

      // Chord starters.
      if (key === "g") {
        e.preventDefault();
        startChord("g");
        return;
      }
      if (key === "n") {
        e.preventDefault();
        startChord("n");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
    };
  }, [navigate, onQuickAdd, showShortcutsHelp, startChord, clearChord]);

  return {
    showShortcutsHelp,
    toggleShortcutsHelp,
    closeShortcutsHelp,
  };
}
