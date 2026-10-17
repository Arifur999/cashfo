import { cn } from "@/lib/utils";

export interface Bar {
  label: string;
  value: number;
  // Printed above the bar; nothing when left out.
  short?: string;
  highlight?: boolean;
}

interface MiniBarsProps {
  bars: Bar[];
  height?: number;
  label: string;
  // Space between bars, in the spacing scale: 4 on the dashboard, 6 on
  // the Revenue page's wider chart.
  gap?: "4" | "6";
}

const GAP = { "4": "gap-4", "6": "gap-6" } as const;

// A row of bars, the tallest filling the height; the highlighted one (the
// month that is running) in forest, the rest in mint.
const MiniBars = ({ bars, height = 150, label, gap = "4" }: MiniBarsProps) => {
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  return (
    <div className="flex flex-col gap-1.5">
      <div role="img" aria-label={label} className={cn("flex items-end border-b border-line px-2", GAP[gap])} style={{ height }}>
        {bars.map((bar) => (
          <span key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {bar.short && <span className="text-caption font-semibold whitespace-nowrap text-ink-2 tabular-nums">{bar.short}</span>}
            <span
              className={cn("w-full max-w-13.5 rounded-t-lg", bar.highlight ? "bg-forest dark:bg-emerald" : "bg-mint-300")}
              style={{ height: max > 0 ? `${Math.max(2, Math.round((bar.value / max) * (height - (bar.short ? 32 : 8))))}px` : "2px" }}
            />
          </span>
        ))}
      </div>
      <div className={cn("flex px-2", GAP[gap])}>
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
