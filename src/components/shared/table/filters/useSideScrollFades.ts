"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const FADE = 24;

// A row of tabs wider than its box (five status tabs on a phone) scrolls
// sideways, and its edges fade while there is more beyond them. The pressed
// tab is brought into view whenever `current` changes (a link that opens on
// the last tab), without moving the page. Without any overflow there is no
// mask at all, so a row that fits draws exactly as before.
export function useSideScrollFades<T extends HTMLElement>(current: string) {
  const ref = useRef<T>(null);
  const [fades, setFades] = useState({ left: false, right: false });

  useEffect(() => {
    const box = ref.current;
    const tab = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!box || !tab || box.scrollWidth <= box.clientWidth) return;
    const edges = box.getBoundingClientRect();
    const shown = tab.getBoundingClientRect();
    // Clear of the fade, so the tab doesn't sit half washed out.
    if (shown.left < edges.left + FADE) box.scrollLeft -= edges.left + FADE - shown.left;
    else if (shown.right > edges.right - FADE) box.scrollLeft += shown.right - (edges.right - FADE);
  }, [current]);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const update = () => {
      const left = box.scrollLeft > 4;
      const right = box.scrollWidth - box.scrollLeft - box.clientWidth > 4;
      setFades((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    update();
    box.addEventListener("scroll", update, { passive: true });
    // The tabs grow when their counts arrive, so watch them as well as the box.
    const observer = new ResizeObserver(update);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    return () => {
      box.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  if (!fades.left && !fades.right) return { ref, style: undefined };
  const left = fades.left ? `transparent 0, #000 ${FADE}px` : "#000 0";
  const right = fades.right ? `#000 calc(100% - ${FADE}px), transparent 100%` : "#000 100%";
  const mask = `linear-gradient(to right, ${left}, ${right})`;
  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask };
  return { ref, style };
}
