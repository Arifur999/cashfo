"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { HabitMonthLogs } from "@/lib/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

// A per-day heatmap cell, colored by how large a share of the user's
// currently-active habits were completed that day -- deliberately a rough
// approximation (it doesn't account for which habits were actually
// SCHEDULED that specific day, e.g. a WEEKLY_DAYS habit not due on a given
// weekday) rather than a second, more precise backend endpoint, since this
// is a glance-level view, not the source of truth (Stats/Habits pages are).
export function HabitCalendarPageClient({ month, data }: { month: string; data: HabitMonthLogs }) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeHabitCount = data.habits.filter((h) => !h.isArchived).length;
  const completedByDate = new Map<string, number>();
  for (const log of data.logs) {
    if (!log.completed) continue;
    const key = log.date.slice(0, 10);
    completedByDate.set(key, (completedByDate.get(key) ?? 0) + 1);
  }

  const [year, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();
  const cells: (string | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7 !== 0) cells.push(null);

  function goToMonth(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.push(`/habit-tracker/calendar?${params.toString()}`);
  }

  function intensityClass(count: number): string {
    if (activeHabitCount === 0 || count === 0) return "bg-neutral-50 text-neutral-400";
    const ratio = count / activeHabitCount;
    if (ratio >= 1) return "bg-emerald-600 text-white";
    if (ratio >= 0.67) return "bg-emerald-400 text-white";
    if (ratio >= 0.34) return "bg-emerald-200 text-emerald-800";
    return "bg-emerald-100 text-emerald-700";
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Calendar")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("How many habits you completed each day.")}</p>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => goToMonth(shiftMonth(month, -1))} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-neutral-900">{monthLabel(month)}</h2>
          <button type="button" onClick={() => goToMonth(shiftMonth(month, 1))} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="pb-1 text-xs font-medium text-neutral-400">
              {t(label)}
            </div>
          ))}
          {cells.map((dateKey, i) => {
            if (!dateKey) return <div key={i} />;
            const day = Number(dateKey.slice(8, 10));
            const count = completedByDate.get(dateKey) ?? 0;
            return (
              <div key={dateKey} title={`${count}/${activeHabitCount}`} className={`flex flex-col items-center justify-center rounded-lg py-2.5 text-xs font-medium ${intensityClass(count)}`}>
                <span>{day}</span>
                {activeHabitCount > 0 && <span className="text-[10px] opacity-80">{count}/{activeHabitCount}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
