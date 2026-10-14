"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface ScrollFades {
  top: boolean;
  bottom: boolean;
}

const FADE = 40;

// A long menu scrolls; its edges fade to say so. Returns the ref for the
// scrolling element and a mask style that fades whichever edge has more
// content beyond it.
export function useScrollFades<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [fades, setFades] = useState<ScrollFades>({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop > 4;
      const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
      setFades((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
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
  }, []);

  const top = fades.top ? `transparent 0, #000 ${FADE}px` : "#000 0";
  const bottom = fades.bottom ? `#000 calc(100% - ${FADE}px), transparent 100%` : "#000 100%";
  const mask = `linear-gradient(to bottom, ${top}, ${bottom})`;
  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask };

  return { ref, style };
}
