"use client";

import { useEffect } from "react";

// Paper is white whatever the screen's theme: the dark theme comes off
// while the browser prints and goes back on after.
export function usePrintInLight() {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) root.classList.add("dark");
      wasDark = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}
