// One theme per tracker page family (Ramadan, Namaz). Every field is a COMPLETE
// literal Tailwind class string (or a raw CSS value) -- Tailwind only sees
// class names that appear whole in the source, so nothing here can be built
// by concatenation (no `bg-${colour}-500`). The shared TrackerHero /
// TrackerGrid / TrackerSummary pieces just splice these in.
export interface TrackerTheme {
  // ---- hero banner ----
  heroGradient: string; // CSS gradient painted under the stars
  starAccent: string; // "r,g,b" of the tinted stars (the rest are white)
  heroShadow: string;
  heroText: string; // subtitle / back link / progress-chip label colour
  heroArabic: string; // the calligraphy title
  heroWatermark: string; // the big faint icon
  heroSpark: string; // the small sparkle
  cta: string; // primary action button on the banner
  // ---- list cards ----
  cardBorder: string;
  cardHeader: string; // gradient stops of a card's header strip
  cardSub: string; // small line on the header strip
  emptyIcon: string;
  bar: string; // gradient stops of progress bars
  // ---- sheet grid ----
  weekLabel: string;
  weekTint: string;
  chartBar: string; // gradient stops of the daily-percentage bars
  todayPill: string; // the day number of today's column (Namaz)
  checkOn: string;
  checkOff: string;
  // ---- summary card ----
  ringColor: string; // conic-gradient colour
  stripColors: string; // gradient stops of the thin top edge
  summaryIcon: string;
  tileA: string; // "Perfect days" number
  tileB: string; // "Best day" number
}

// Emerald + gold (the Ramadan pages).
export const RAMADAN_THEME: TrackerTheme = {
  heroGradient: "linear-gradient(135deg, #0b3d2e 0%, #0f5a45 46%, #14305c 100%)",
  starAccent: "253,230,138",
  heroShadow: "shadow-emerald-950/25",
  heroText: "text-emerald-100/80",
  heroArabic: "text-amber-200",
  heroWatermark: "text-amber-200/15",
  heroSpark: "text-amber-200/40",
  cta: "flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-md shadow-black/20 transition hover:from-amber-100 hover:to-amber-300 disabled:opacity-60",
  cardBorder: "border-amber-200/50",
  cardHeader: "from-emerald-900 to-indigo-950",
  cardSub: "text-amber-200/90",
  emptyIcon: "text-amber-400",
  bar: "from-amber-300 to-amber-500",
  weekLabel: "text-emerald-600",
  weekTint: "bg-[image:linear-gradient(rgb(16_185_129/0.14),rgb(16_185_129/0.14))]",
  chartBar: "from-amber-500 to-amber-300",
  todayPill: "bg-amber-500 text-white",
  checkOn: "border-emerald-600 bg-emerald-600 text-white",
  checkOff: "border-neutral-300 bg-surface hover:border-emerald-500",
  ringColor: "#f59e0b",
  stripColors: "from-emerald-500 via-amber-400 to-indigo-500",
  summaryIcon: "text-amber-500",
  tileA: "text-emerald-600",
  tileB: "text-amber-600",
};

// Sapphire blue + silver (the Namaz pages).
export const NAMAZ_THEME: TrackerTheme = {
  heroGradient: "linear-gradient(135deg, #0a1f44 0%, #123a7a 46%, #2b2f8f 100%)",
  starAccent: "186,230,253",
  heroShadow: "shadow-blue-950/30",
  heroText: "text-sky-100/80",
  heroArabic: "text-sky-100",
  heroWatermark: "text-sky-100/15",
  heroSpark: "text-sky-100/40",
  cta: "flex items-center gap-2 rounded-xl bg-gradient-to-b from-sky-100 to-sky-300 px-4 py-2.5 text-sm font-semibold text-blue-950 shadow-md shadow-black/20 transition hover:from-white hover:to-sky-200 disabled:opacity-60",
  cardBorder: "border-sky-200/60",
  cardHeader: "from-blue-950 to-indigo-900",
  cardSub: "text-sky-200/90",
  emptyIcon: "text-sky-400",
  bar: "from-sky-300 to-blue-500",
  weekLabel: "text-blue-600",
  weekTint: "bg-[image:linear-gradient(rgb(59_130_246/0.14),rgb(59_130_246/0.14))]",
  chartBar: "from-blue-600 to-sky-300",
  todayPill: "bg-blue-600 text-white",
  checkOn: "border-blue-600 bg-blue-600 text-white",
  checkOff: "border-neutral-300 bg-surface hover:border-blue-500",
  ringColor: "#3b82f6",
  stripColors: "from-blue-500 via-sky-300 to-indigo-500",
  summaryIcon: "text-blue-500",
  tileA: "text-blue-600",
  tileB: "text-sky-600",
};
