"use client";

import { useEffect } from "react";
import { useScrollFades } from "@/hooks/useScrollFades";

const FADE = 24;

// A row of tabs wider than its box (five status tabs on a phone) scrolls
// sideways, and its edges fade while there is more beyond them (the shared
// useScrollFades, which draws no mask while the row fits). The pressed tab is
// brought into view whenever `current` changes (a link that opens on the last
// tab), without moving the page.
export function useSideScrollFades<T extends HTMLElement>(current: string) {
  const { ref, style } = useScrollFades<T>({ axis: "x", fade: FADE });

  useEffect(() => {
    const box = ref.current;
    const tab = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!box || !tab || box.scrollWidth <= box.clientWidth) return;
    const edges = box.getBoundingClientRect();
    const shown = tab.getBoundingClientRect();
    // Clear of the fade, so the tab doesn't sit half washed out.
    if (shown.left < edges.left + FADE) box.scrollLeft -= edges.left + FADE - shown.left;
    else if (shown.right > edges.right - FADE) box.scrollLeft += shown.right - (edges.right - FADE);
  }, [ref, current]);

  return { ref, style };
}
