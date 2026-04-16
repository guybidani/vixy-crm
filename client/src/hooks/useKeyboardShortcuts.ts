import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

type QuickAddType = "task" | "contact" | "deal";

interface UseKeyboardShortcutsOptions {
  onQuickAdd: (type?: QuickAddType) => void;
}

interface UseKeyboardShortcutsReturn {
  showShortcutsHelp: boolean;
  toggleShortcutsHelp: () => void;
  closeShortcutsHelp: () => void;
}

function isEditingContext(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (document.querySelector('[role="dialog"]')) return true;
  return false;
}

const CHORD_TIMEOUT = 200;

const CHORD_MAP: Record<string, string> = {
  d: "/dashboard",
  c: "/contacts",
  e: "/deals",
  t: "/tasks",
  k: "/tickets",
  s: "/settings",
};

export function useKeyboardShortcuts({
  onQuickAdd,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsReturn {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const navigate = useNavigate();
  const chordPendingRef = useRef(false);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp((prev) => !prev);
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(false);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when modifier keys are held (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape: close overlays
      if (e.key === "Escape") {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          e.preventDefault();
        }
        return;
      }

      // Don't fire shortcuts when user is typing in an input, editing, or a dialog is open
      if (isEditingContext()) return;

      // Handle chord second key
      if (chordPendingRef.current) {
        chordPendingRef.current = false;
        if (chordTimerRef.current) {
          clearTimeout(chordTimerRef.current);
          chordTimerRef.current = null;
        }
        const lowerKey = e.key.toLowerCase();
        const route = CHORD_MAP[lowerKey];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        return;
      }

      const key = e.key.toLowerCase();

      // G chord start
      if (key === "g") {
        e.preventDefault();
        chordPendingRef.current = true;
        chordTimerRef.current = setTimeout(() => {
          chordPendingRef.current = false;
          chordTimerRef.current = null;
        }, CHORD_TIMEOUT);
        return;
      }

      // ? toggle shortcuts help (Shift+/ on most keyboards)
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      // Single-key shortcuts
      switch (key) {
        case "n":
          e.preventDefault();
          onQuickAdd("task");
          break;
        case "c":
          e.preventDefault();
          onQuickAdd("contact");
          break;
        case "d":
          e.preventDefault();
          onQuickAdd("deal");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
    };
  }, [navigate, onQuickAdd, showShortcutsHelp]);

  return {
    showShortcutsHelp,
    toggleShortcutsHelp,
    closeShortcutsHelp,
  };
}
