import { ChevronLeft, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { arefRuqaa } from "./fonts";
import type { TrackerTheme } from "./theme";

// A scatter of tiny "stars" -- radial-gradient dots layered over the banner
// gradient, so the theme needs no images or extra requests. Most are white;
// a few take the theme's accent tint.
function makeStars(accent: string): string {
  return [
    "radial-gradient(circle at 8% 24%, rgba(255,255,255,.9) 0 1px, transparent 1.8px)",
    "radial-gradient(circle at 17% 68%, rgba(255,255,255,.55) 0 1px, transparent 1.6px)",
    `radial-gradient(circle at 29% 18%, rgba(${accent},.8) 0 1.2px, transparent 2px)`,
    "radial-gradient(circle at 41% 74%, rgba(255,255,255,.7) 0 1px, transparent 1.7px)",
    "radial-gradient(circle at 52% 30%, rgba(255,255,255,.5) 0 1px, transparent 1.6px)",
    `radial-gradient(circle at 63% 82%, rgba(${accent},.7) 0 1.2px, transparent 2px)`,
    "radial-gradient(circle at 74% 20%, rgba(255,255,255,.85) 0 1px, transparent 1.8px)",
    "radial-gradient(circle at 86% 58%, rgba(255,255,255,.6) 0 1px, transparent 1.6px)",
    `radial-gradient(circle at 94% 14%, rgba(${accent},.8) 0 1.4px, transparent 2.2px)`,
    "radial-gradient(circle at 36% 46%, rgba(255,255,255,.4) 0 .8px, transparent 1.4px)",
  ].join(", ");
}

interface TrackerHeroProps {
  theme: TrackerTheme;
  arabic: string; // the calligraphy title, e.g. "رمضان كريم"
  watermark: LucideIcon; // big faint icon top-right
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  // Right-hand side: the page's main action or a summary.
  children?: ReactNode;
}

// The themed banner at the top of the Ramadan and Namaz pages: stars, a big
// faint icon, gold/silver Arabic calligraphy, then the page title.
export function TrackerHero({ theme, arabic, watermark: Watermark, title, subtitle, back, children }: TrackerHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl px-6 py-6 text-white shadow-lg ${theme.heroShadow} sm:px-8 sm:py-7`}
      style={{ backgroundImage: `${makeStars(theme.starAccent)}, ${theme.heroGradient}` }}
    >
      <Watermark aria-hidden className={`pointer-events-none absolute -right-6 -top-8 h-44 w-44 ${theme.heroWatermark}`} />
      <Sparkles aria-hidden className={`pointer-events-none absolute bottom-3 left-[46%] h-5 w-5 ${theme.heroSpark}`} />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className={`mb-2 inline-flex items-center gap-1 text-xs font-medium ${theme.heroText} transition hover:text-white`}>
              <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
            </Link>
          )}
          <p lang="ar" dir="rtl" className={`${arefRuqaa.className} text-3xl leading-tight ${theme.heroArabic} sm:text-4xl`}>
            {arabic}
          </p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{title}</h1>
          {subtitle && <p className={`mt-1 text-sm ${theme.heroText}`}>{subtitle}</p>}
        </div>
        {children && <div className="relative shrink-0">{children}</div>}
      </div>
    </div>
  );
}
