"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// Whether the device is online, the one reading the offline banner shows:
// a button that saves can wait for the connection (Move money, Save) rather
// than fail on send. The server render, and hydration, assume online, so
// nothing flashes on load.
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
