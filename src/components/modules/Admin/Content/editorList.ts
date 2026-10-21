"use client";

import { useEffect } from "react";

// What the two list-and-editor pages share (Content › Legal pages,
// Notifications › Templates): a list of documents on the left, the one
// being edited on the right, stacked on a phone.

// lg, where the list and the editor sit side by side.
const SIDE_BY_SIDE = "(min-width: 64rem)";

// On a phone the editor sits under the list, so picking an item would
// change something off screen: bring the editor's heading into view and
// move focus there (the heading takes tabIndex={-1}).
export const revealEditor = (heading: HTMLElement | null) => {
  if (!heading || window.matchMedia(SIDE_BY_SIDE).matches) return;
  heading.scrollIntoView({ block: "start" });
  heading.focus({ preventScroll: true });
};

// While anything is unsaved, closing or reloading the tab asks first.
export const useUnsavedGuard = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers ask only when this is set.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
};
