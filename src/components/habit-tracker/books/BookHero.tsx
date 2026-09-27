"use client";

import { BookOpen, Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BOOK_PALETTE } from "./bookPalette";
import { BOOK_CTA } from "./bookTheme";
import { SERIF_STACK } from "./fonts";
import { READING_QUOTES } from "./readingQuotes";

// A row of book spines standing on a shelf, bottom-right of the banner --
// [width px, height px, palette index]. Pure decoration.
const SPINES: [number, number, number][] = [
  [16, 96, 0],
  [22, 128, 3],
  [14, 108, 8],
  [24, 148, 1],
  [18, 116, 5],
  [20, 136, 6],
  [14, 100, 4],
  [26, 152, 2],
  [18, 120, 9],
  [16, 104, 7],
  [22, 138, 0],
  [14, 92, 3],
];

function Shelf() {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-0 right-6 hidden items-end md:flex">
      <div className="flex items-end gap-[3px] pb-2">
        {SPINES.map(([w, h, colour], i) => (
          <div
            key={i}
            className="rounded-t-[3px] shadow-[inset_-2px_0_0_rgba(0,0,0,0.22),inset_2px_0_0_rgba(255,255,255,0.14)]"
            style={{ width: w, height: h, backgroundImage: `linear-gradient(180deg, ${BOOK_PALETTE[colour].from}, ${BOOK_PALETTE[colour].to})`, opacity: 0.9 }}
          />
        ))}
      </div>
      <div className="absolute inset-x-[-14px] bottom-0 h-2 rounded-sm bg-black/35" />
    </div>
  );
}

// The Book page's banner: a walnut-toned library corner with a quote for the
// day (picked from `quoteDay`, so it's the same on server and client) and the
// "Add Book" button.
export function BookHero({ quoteDay, onAdd }: { quoteDay: number; onAdd: () => void }) {
  const { t } = useLocale();
  const quote = READING_QUOTES[quoteDay % READING_QUOTES.length];

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg shadow-amber-950/30 sm:px-9 sm:py-9"
      style={{
        backgroundImage:
          "radial-gradient(circle at 88% 8%, rgba(232,168,100,.30), transparent 42%), radial-gradient(circle at 8% 115%, rgba(232,168,100,.16), transparent 45%), linear-gradient(135deg, #2a1810 0%, #46291a 50%, #6b4226 100%)",
      }}
    >
      <Shelf />
      <div className="relative max-w-2xl md:pb-2">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
          <BookOpen className="h-4 w-4" /> {t("Reading room")}
        </p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ fontFamily: SERIF_STACK }}>
          {t("My Library")}
        </h1>
        <figure className="mt-4 max-w-xl">
          <blockquote className="text-base italic leading-relaxed text-amber-50/90 sm:text-lg" style={{ fontFamily: SERIF_STACK }}>
            “{t(quote.text)}”
          </blockquote>
          <figcaption className="mt-1.5 text-sm text-amber-200/70">— {t(quote.by)}</figcaption>
        </figure>
        <button type="button" onClick={onAdd} className={`${BOOK_CTA} mt-6`}>
          <Plus className="h-4 w-4" /> {t("Add Book")}
        </button>
      </div>
    </div>
  );
}
