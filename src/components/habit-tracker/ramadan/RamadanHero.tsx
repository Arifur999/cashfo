import { ChevronLeft, MoonStar, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { arefRuqaa } from "./fonts";

// Gold call-to-action used on the Ramadan pages' dark banner.
export const RAMADAN_GOLD_BUTTON =
  "flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-md shadow-black/20 transition hover:from-amber-100 hover:to-amber-300 disabled:opacity-60";

// A scatter of tiny "stars" -- radial-gradient dots layered over the banner
// gradient, so the theme needs no images or extra requests.
const STARS = [
  "radial-gradient(circle at 8% 24%, rgba(255,255,255,.9) 0 1px, transparent 1.8px)",
  "radial-gradient(circle at 17% 68%, rgba(255,255,255,.55) 0 1px, transparent 1.6px)",
  "radial-gradient(circle at 29% 18%, rgba(253,230,138,.8) 0 1.2px, transparent 2px)",
  "radial-gradient(circle at 41% 74%, rgba(255,255,255,.7) 0 1px, transparent 1.7px)",
  "radial-gradient(circle at 52% 30%, rgba(255,255,255,.5) 0 1px, transparent 1.6px)",
  "radial-gradient(circle at 63% 82%, rgba(253,230,138,.7) 0 1.2px, transparent 2px)",
  "radial-gradient(circle at 74% 20%, rgba(255,255,255,.85) 0 1px, transparent 1.8px)",
  "radial-gradient(circle at 86% 58%, rgba(255,255,255,.6) 0 1px, transparent 1.6px)",
  "radial-gradient(circle at 94% 14%, rgba(253,230,138,.8) 0 1.4px, transparent 2.2px)",
  "radial-gradient(circle at 36% 46%, rgba(255,255,255,.4) 0 .8px, transparent 1.4px)",
].join(", ");

interface RamadanHeroProps {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  // Right-hand side: the page's main action or a summary.
  children?: ReactNode;
}

// The deep emerald-to-midnight banner that gives the Ramadan pages their
// look: stars, a big faint crescent, gold Arabic calligraphy.
export function RamadanHero({ title, subtitle, back, children }: RamadanHeroProps) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-6 text-white shadow-lg shadow-emerald-950/25 sm:px-8 sm:py-7"
      style={{ backgroundImage: `${STARS}, linear-gradient(135deg, #0b3d2e 0%, #0f5a45 46%, #14305c 100%)` }}
    >
      <MoonStar aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-amber-200/15" />
      <Sparkles aria-hidden className="pointer-events-none absolute bottom-3 left-[46%] h-5 w-5 text-amber-200/40" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-100/80 transition hover:text-white">
              <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
            </Link>
          )}
          <p lang="ar" dir="rtl" className={`${arefRuqaa.className} text-3xl leading-tight text-amber-200 sm:text-4xl`}>
            رمضان كريم
          </p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-emerald-100/80">{subtitle}</p>}
        </div>
        {children && <div className="relative shrink-0">{children}</div>}
      </div>
    </div>
  );
}
