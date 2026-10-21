"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

// True while the page prints (the Print button or the browser's own
// Ctrl P), so a paged or folded list can lay every row out for the paper,
// not just the page on screen. beforeprint runs before the browser takes
// its snapshot, and flushSync puts the rows in there and then.
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return printing;
}
