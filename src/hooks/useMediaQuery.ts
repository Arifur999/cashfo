"use client";

import { useSyncExternalStore } from "react";

// Whether a media query matches, kept in sync with the window. The server
// (and hydration) answer `false`, so anything that depends on it must
// render the same on both until mounted.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
