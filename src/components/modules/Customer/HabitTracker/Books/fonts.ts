import { Playfair_Display } from "next/font/google";

// The serif of the book pages -- cover titles, the page heading, the quote.
// Latin only; Bangla text falls through to Anek Bangla (loaded in layout.tsx).
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], display: "swap" });

export const SERIF_STACK = `${playfair.style.fontFamily}, var(--font-anek-bangla), Georgia, serif`;
