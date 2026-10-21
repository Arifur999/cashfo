"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface Bar {
  label: string;
  value: number;
  // Printed above the bar; nothing when left out. Left out too on a bar
  // whose slot is narrower than it (a phone, a narrow column), rather than
  // run into the next bar's.
  short?: string;
  highlight?: boolean;
  // What a screen reader hears for this bar ("October ৳ 60,400"); the label
  // and the short figure (or the value) when left out.
  spoken?: string;
}

interface MiniBarsProps {
  bars: Bar[];
  height?: number;
  // The chart's name ("MRR, last 6 months"); a screen reader hears it
  // before the list of every bar's figure.
  label: string;
  // Space between bars, in the spacing scale: 4 on the dashboard, 6 on
  // the Revenue page's wider chart.
  gap?: "4" | "6";
}

const GAP = { "4": "gap-4", "6": "gap-6" } as const;

// A row of bars, the tallest filling the height; the highlighted one (the
// month that is running) in forest, the rest in mint. When the bars say how
// they are spoken, the drawing is hidden from screen readers, which get the
// chart's name and a list of the bars instead.
const MiniBars = ({ bars, height = 150, label, gap = "4" }: MiniBarsProps) => {
  const { translate, locale } = useLocale();
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  // The list only once a caller says how each bar is spoken: until then its
  // label still names every figure, which the list would repeat, so the
  // drawing stays one image under that label.
  const listed = bars.some((bar) => bar.spoken);
  return (
    <div className="flex flex-col gap-1.5">
      {listed && (
        // role="list": Safari drops a list's role once its bullets are styled away.
        <ul role="list" aria-label={translate(label)} className="sr-only">
          {bars.map((bar) => (
            <li key={bar.label}>{bar.spoken ?? `${bar.label} ${bar.short ?? formatCount(bar.value, locale)}`}</li>
          ))}
        </ul>
      )}
      <div
        {...(listed ? { "aria-hidden": true } : { role: "img", "aria-label": translate(label) })}
        className={cn("flex items-end border-b border-line px-2", GAP[gap])}
        style={{ height }}
      >
        {bars.map((bar) => (
          <span key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            {bar.short && (
              // One line tall, and clipped: the empty first item lets a
              // figure wider than its slot wrap onto a second line, out of
              // sight. A figure that fits stays on the first, centred.
              <span className="flex h-4 w-full flex-wrap justify-center overflow-hidden text-caption leading-4 font-semibold text-ink-2 tabular-nums">
                <span className="h-4" />
                <span className="whitespace-nowrap">{bar.short}</span>
              </span>
            )}
            <span
              className={cn("w-full max-w-13.5 rounded-t-lg", bar.highlight ? "bg-forest dark:bg-emerald" : "bg-mint-300")}
              style={{ height: max > 0 ? `${Math.max(2, Math.round((bar.value / max) * (height - (bar.short ? 32 : 8))))}px` : "2px" }}
            />
          </span>
        ))}
      </div>
      <div aria-hidden={listed || undefined} className={cn("flex px-2", GAP[gap])}>
        {bars.map((bar) => (
          <span key={bar.label} className={cn("flex-1 text-center text-caption", bar.highlight ? "font-semibold text-ink" : "text-ink-muted")}>
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MiniBars;
