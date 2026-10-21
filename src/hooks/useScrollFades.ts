"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// "y" for a menu that scrolls down, "x" for a bar that scrolls sideways.
export type ScrollAxis = "x" | "y";

// Whether there is more content past each end: the top or left ("start"),
// the bottom or right ("end").
export interface ScrollFades {
  start: boolean;
  end: boolean;
}

type ScrollBox = Pick<HTMLElement, "scrollTop" | "scrollLeft" | "scrollHeight" | "scrollWidth" | "clientHeight" | "clientWidth">;

interface ScrollFadesOptions {
  axis?: ScrollAxis;
  // How far the fade reaches in, in px.
  fade?: number;
}

const FADE = 40;

// Which ends of the box have content beyond them. 4px of slack, so a fade
// doesn't stay on for a part-pixel scroll.
export function scrollFadesOf(box: ScrollBox, axis: ScrollAxis = "y"): ScrollFades {
  const offset = axis === "x" ? box.scrollLeft : box.scrollTop;
  const size = axis === "x" ? box.scrollWidth : box.scrollHeight;
  const shown = axis === "x" ? box.clientWidth : box.clientHeight;
  return { start: offset > 4, end: size - offset - shown > 4 };
}

// The mask that fades whichever ends have more beyond them.
export function scrollFadeMask({ start, end }: ScrollFades, axis: ScrollAxis = "y", fade = FADE): string {
  const from = start ? `transparent 0, #000 ${fade}px` : "#000 0";
  const to = end ? `#000 calc(100% - ${fade}px), transparent 100%` : "#000 100%";
  return `linear-gradient(to ${axis === "x" ? "right" : "bottom"}, ${from}, ${to})`;
}

// A long menu scrolls; its edges fade to say so (a sideways bar's too, with
// axis "x"). Returns the ref for the scrolling element and a mask style that
// fades whichever edge has more content beyond it. While nothing overflows
// there is no mask at all, so a box that fits draws exactly as before.
export function useScrollFades<T extends HTMLElement>({ axis = "y", fade = FADE }: ScrollFadesOptions = {}) {
  const ref = useRef<T>(null);
  const [fades, setFades] = useState<ScrollFades>({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = scrollFadesOf(el, axis);
      setFades((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // The list grows when a group opens, so watch the content as well as the box.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [axis]);

  if (!fades.start && !fades.end) return { ref, style: undefined };
  const mask = scrollFadeMask(fades, axis, fade);
  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask };

  return { ref, style };
}
