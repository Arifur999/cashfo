import { Outfit } from "next/font/google";

// The display face of the Others page -- the heading, the quote, big numbers.
// Latin only; Bangla text falls through to Hind Siliguri (loaded in layout.tsx).
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

export const DISPLAY_STACK = `${outfit.style.fontFamily}, var(--font-hind-siliguri), system-ui, sans-serif`;
