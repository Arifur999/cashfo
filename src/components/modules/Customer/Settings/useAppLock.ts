"use client";

import { useCallback, useSyncExternalStore } from "react";
import { APP_LOCK_EVENT, APP_LOCK_KEY, NO_LOCK, parseAppLock, type AppLock } from "@/lib/customer/appLock";

// One parsed lock per stored text, so React sees the same object until the
// setting really changes.
const parsed = new Map<string, { raw: string | null; lock: AppLock }>();

function snapshot(userId: string): AppLock {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`${APP_LOCK_KEY}:${userId}`);
  } catch {
    return NO_LOCK;
  }
  const cached = parsed.get(userId);
  if (cached && cached.raw === raw) return cached.lock;
  const lock = parseAppLock(raw);
  parsed.set(userId, { raw, lock });
  return lock;
}

function subscribe(onChange: () => void) {
  window.addEventListener(APP_LOCK_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(APP_LOCK_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// This device's app lock for the person (off on the server's first paint).
export function useAppLock(userId: string): AppLock {
  const read = useCallback(() => snapshot(userId), [userId]);
  return useSyncExternalStore(subscribe, read, () => NO_LOCK);
}
