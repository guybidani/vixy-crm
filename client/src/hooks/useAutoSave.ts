import { useEffect, useRef, useCallback } from "react";

/**
 * Auto-save hook — debounces value changes and calls saveFn after delay.
 * Shows no UI; pair with a subtle "שומר..." indicator if needed.
 */
export function useAutoSave(
  value: string,
  saveFn: (val: string) => void | Promise<void>,
  opts?: { delay?: number; enabled?: boolean },
) {
  const delay = opts?.delay ?? 1500;
  const enabled = opts?.enabled ?? true;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(value);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (lastSavedRef.current !== value) {
      lastSavedRef.current = value;
      saveFnRef.current(value);
    }
  }, [value]);

  useEffect(() => {
    if (!enabled) return;
    if (value === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = value;
      saveFnRef.current(value);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, enabled]);

  // Flush on unmount so we don't lose unsaved text
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (lastSavedRef.current !== value) {
          saveFnRef.current(value);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { flush };
}
