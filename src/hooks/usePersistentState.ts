"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const SAME_TAB_EVENT = "app:persistent-state";

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing / blocked storage: behave as if nothing was stored.
    return null;
  }
};

const subscribe = (onChange: () => void) => {
  // `storage` covers other tabs; the custom event covers this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(SAME_TAB_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAME_TAB_EVENT, onChange);
  };
};

// localStorage-backed state that is hydration-safe without a
// setState-in-effect: the server snapshot is always null (-> defaultValue),
// so server HTML and the first client render match, then
// useSyncExternalStore switches to the stored value. Falls back to plain
// in-memory state when there's no key or storage is unavailable.
// Pass a stable (module-level) defaultValue.
export function usePersistentState<T>(key: string | undefined, defaultValue: T) {
  const [memoryValue, setMemoryValue] = useState<T>(defaultValue);
  const raw = useSyncExternalStore(
    subscribe,
    () => (key ? readStorage(key) : null),
    () => null,
  );

  const value = useMemo<T>(() => {
    if (raw === null) {
      return memoryValue;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return memoryValue;
    }
  }, [raw, memoryValue]);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(value) : next;
      setMemoryValue(resolved);
      if (!key) {
        return;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        window.dispatchEvent(new Event(SAME_TAB_EVENT));
      } catch {
        // Best-effort persistence; the in-memory value above still applies.
      }
    },
    [key, value],
  );

  return [value, setValue] as const;
}
