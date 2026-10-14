import { Space_Grotesk } from "next/font/google";

// The display face of the Skills pages -- the heading, the quote, big numbers.
// Latin only; Bangla text falls through to Anek Bangla (loaded in layout.tsx).
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

export const DISPLAY_STACK = `${spaceGrotesk.style.fontFamily}, var(--font-anek-bangla), system-ui, sans-serif`;
