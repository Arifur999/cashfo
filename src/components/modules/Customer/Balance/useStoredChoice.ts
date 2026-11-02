"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "smartly-stored-choice";
// Choices made where storage is blocked hold for as long as the tab does.
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

// A choice this browser remembers (Accounts' view and sort): one of
// `allowed`, `fallback` until one is picked and on the server, so the first
// paint never disagrees with it.
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (next: T) => void] {
  const read = useCallback(() => {
    const value = stored(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  }, [key, allowed, fallback]);
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Blocked storage: the in-memory copy above holds it.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}
