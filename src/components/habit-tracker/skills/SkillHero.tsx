"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { SKILL_CTA } from "./skillTheme";
import { SKILL_QUOTES } from "./skillQuotes";

// Rising steps in the banner's bottom-right corner -- [width px, height px].
// Pure decoration: each step a little higher than the last.
const STEPS: [number, number][] = [
  [30, 40],
  [30, 64],
  [30, 90],
  [30, 118],
  [30, 148],
];

function Steps() {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-0 right-8 hidden items-end gap-1.5 md:flex">
      {STEPS.map(([w, h], i) => (
        <div
          key={i}
          className="rounded-t-md border-t-4 border-lime-300/90 bg-gradient-to-b from-violet-400/45 to-violet-700/30 shadow-[inset_1px_0_0_rgba(255,255,255,0.18)]"
          style={{ width: w, height: h }}
        />
      ))}
    </div>
  );
}

// The Skills page's banner: a deep-violet study corner with a quote for the
// day (picked from `quoteDay`, so it's the same on server and client) and the
// "Add Skill" button in the top-right.
export function SkillHero({ quoteDay, onAdd }: { quoteDay: number; onAdd: () => void }) {
  const { t } = useLocale();
  const quote = SKILL_QUOTES[quoteDay % SKILL_QUOTES.length];

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg shadow-violet-950/30 sm:min-h-[16rem] sm:px-9 sm:py-9"
      style={{
        backgroundImage:
          "radial-gradient(circle at 90% 6%, rgba(190,242,100,.22), transparent 40%), radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(135deg, #1e1046 0%, #3b1a78 50%, #5b2ca0 100%)",
        backgroundSize: "auto, 22px 22px, auto",
      }}
    >
      <Steps />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-lime-300/90">
            <GraduationCap className="h-4 w-4" /> {t("Learning room")}
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ fontFamily: DISPLAY_STACK }}>
            {t("Skills")}
          </h1>
          <figure className="mt-4 max-w-xl">
            <blockquote className="text-base leading-relaxed text-violet-50/90 sm:text-lg" style={{ fontFamily: DISPLAY_STACK }}>
              “{t(quote.text)}”
            </blockquote>
            <figcaption className="mt-1.5 text-sm text-lime-300/80">— {t(quote.by)}</figcaption>
          </figure>
        </div>
        <button type="button" onClick={onAdd} className={`${SKILL_CTA} shrink-0`}>
          <Plus className="h-4 w-4" /> {t("Add Skill")}
        </button>
      </div>
    </div>
  );
}
