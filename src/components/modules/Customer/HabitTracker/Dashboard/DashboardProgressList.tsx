"use client";

interface ProgressRow {
  label: string;
  pct: number;
  display: string;
}

interface DashboardProgressListProps {
  title: string;
  subtitle: string;
  rows: ProgressRow[];
  barClass: string; // "from-x to-y" Tailwind gradient-stop classes
  emptyText: string;
  footer?: string; // pre-translated "+N more", omitted when nothing was clipped
}

// A small hand-rolled horizontal-progress-bar list for the Habit Tracker
// Dashboard -- Others' active challenges and My Library's in-progress books,
// where "progress so far" (not a day-by-day trend) is the meaningful shape,
// so DashboardBarChart's per-day columns don't fit.
export function DashboardProgressList({ title, subtitle, rows, barClass, emptyText, footer }: DashboardProgressListProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-neutral-700">{row.label}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-neutral-400">{row.display}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-500`}
                  style={{ width: `${row.pct > 0 ? Math.max(4, row.pct) : 0}%` }}
                />
              </div>
            </div>
          ))}
          {footer && <p className="pt-1 text-center text-[11px] text-neutral-400">{footer}</p>}
        </div>
      )}
    </div>
  );
}
