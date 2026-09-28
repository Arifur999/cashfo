"use client";

interface BarPoint {
  label: string;
  value: number;
  display: string;
}

interface DashboardBarChartProps {
  title: string;
  subtitle: string;
  bars: BarPoint[];
  max: number;
  gradient: string; // "from-x to-y" Tailwind gradient-stop classes (a theme's `chartBar`)
  emptyText: string;
  highlightLast?: boolean; // tints the last column (used when it's "today")
}

// A small hand-rolled bar chart for the Habit Tracker Dashboard's per-feature
// overview cards -- same "no charting library, build it ourselves" convention
// as WeekChart.tsx / IncomeVsSavingsChart.tsx, just themed per feature via
// `gradient` and fed pre-computed points instead of owning its own data shape.
export function DashboardBarChart({ title, subtitle, bars, max, gradient, emptyText, highlightLast = false }: DashboardBarChartProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      {bars.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-fit items-end gap-1.5 sm:gap-2" style={{ height: 140 }}>
            {bars.map((bar, i) => {
              const isLast = highlightLast && i === bars.length - 1;
              return (
                <div key={i} className={`flex min-w-[1.75rem] flex-1 flex-col items-center rounded-lg px-0.5 pb-1.5 pt-1 ${isLast ? "bg-neutral-900/5" : ""}`}>
                  <span className="mb-1 h-4 text-[10px] font-semibold tabular-nums text-neutral-500">{bar.value > 0 ? bar.display : ""}</span>
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-6 rounded-t-md bg-gradient-to-t ${gradient} transition-all duration-500`}
                      style={{ height: `${bar.value > 0 ? Math.max(6, (bar.value / max) * 100) : 0}%` }}
                      title={`${bar.label}: ${bar.display}`}
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-medium text-neutral-400">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
