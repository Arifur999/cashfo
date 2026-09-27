"use client";

import { ListChecks, Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { OTHER_CTA } from "./otherTheme";
import { OTHER_QUOTES } from "./otherQuotes";

// A scatter of small dots -- the same lightweight decoration language as the
// other themed pages, in slate/amber instead of stars or spines.
function Dots() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: "radial-gradient(rgba(251,191,36,.35) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
    />
  );
}

// The Others page's banner: a graphite-and-amber checklist corner with a quote
// for the day (picked from `quoteDay`, so it's the same on server and client)
// and the "Add Habit" button in the top-right.
export function OtherHero({ quoteDay, onAdd }: { quoteDay: number; onAdd: () => void }) {
  const { t } = useLocale();
  const quote = OTHER_QUOTES[quoteDay % OTHER_QUOTES.length];

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg shadow-slate-950/30 sm:min-h-[16rem] sm:px-9 sm:py-9"
      style={{ backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)" }}
    >
      <Dots />
      <ListChecks aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-amber-200/10" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            <ListChecks className="h-4 w-4" /> {t("Everyday habits")}
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ fontFamily: DISPLAY_STACK }}>
            {t("Others")}
          </h1>
          <figure className="mt-4 max-w-xl">
            <blockquote className="text-base leading-relaxed text-slate-100/90 sm:text-lg" style={{ fontFamily: DISPLAY_STACK }}>
              “{t(quote.text)}”
            </blockquote>
            <figcaption className="mt-1.5 text-sm text-amber-300/80">— {t(quote.by)}</figcaption>
          </figure>
        </div>
        <button type="button" onClick={onAdd} className={`${OTHER_CTA} shrink-0`}>
          <Plus className="h-4 w-4" /> {t("Add Habit")}
        </button>
      </div>
    </div>
  );
}
