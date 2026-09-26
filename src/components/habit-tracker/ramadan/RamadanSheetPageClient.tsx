"use client";

import { Loader2, MoonStar, Plus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { HabitMonthTracker } from "@/lib/api";
import { addTrackerItemAction, removeTrackerItemAction, setHabitTrackerCheckAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { withCheck } from "../trackerChecks";
import { RAMADAN_THEME } from "../tracker/theme";
import { TrackerGrid, type GridColumn } from "../tracker/TrackerGrid";
import { TrackerHero } from "../tracker/TrackerHero";
import { TrackerSummary } from "../tracker/TrackerSummary";

const SUGGESTIONS = ["Quran", "Hadis", "Dua", "Taraweeh", "Zikr", "Sadaqah", "Tahajjud"];

// The last ten nights' odd ones -- where Laylat al-Qadr is sought.
const ODD_NIGHTS = new Set([21, 23, 25, 27, 29]);

// Soft column tints for the three ashras (Rahmah 1-10, Maghfirah 11-20,
// Nijat 21-end). Painted as a background IMAGE layer on top of an opaque
// bg-surface, so sticky cells stay opaque and dark mode still works.
const TINT_RAHMAH = "bg-[image:linear-gradient(rgb(16_185_129/0.08),rgb(16_185_129/0.08))]";
const TINT_MAGHFIRAH = "bg-[image:linear-gradient(rgb(245_158_11/0.09),rgb(245_158_11/0.09))]";
const TINT_NIJAT = "bg-[image:linear-gradient(rgb(99_102_241/0.09),rgb(99_102_241/0.09))]";

function ashraTint(day: number): string {
  if (day <= 10) return TINT_RAHMAH;
  if (day <= 20) return TINT_MAGHFIRAH;
  return TINT_NIJAT;
}

// Habit rows on the left (numbered, added/removed by hand), a column per day
// with WEEK bands, and a daily-percentage bar chart on top -- one table, one
// scroll box, so the sticky habit column and header rows and the chart bars
// all share the same column grid.
export function RamadanSheetPageClient({ tracker }: { tracker: HabitMonthTracker }) {
  const router = useRouter();
  const { t } = useLocale();
  const [newName, setNewName] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startToggleTransition] = useTransition();

  // Server props stay the source of truth; a tick is layered on top
  // optimistically and disappears once the transition (PUT + refresh) ends.
  const [sheet, applyOptimisticCheck] = useOptimistic(tracker, (current, update: { day: number; item: string; checked: boolean }) =>
    withCheck(current, update.day, update.item, update.checked),
  );

  const { items, totalDays } = sheet;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const ticked = new Set(sheet.checks.map((c) => `${c.day}:${c.item}`));
  const cells = totalDays * items.length;
  const overallPct = cells > 0 ? Math.round((sheet.checks.length / cells) * 100) : 0;
  const columns: GridColumn[] = days.map((day) => ({
    day,
    tint: ashraTint(day),
    title: ODD_NIGHTS.has(day) ? t("Odd night of the last ten -- Laylat al-Qadr is sought in these") : undefined,
    badge: ODD_NIGHTS.has(day) ? <Star className="absolute right-0.5 top-0.5 h-2 w-2 fill-amber-400 text-amber-400" /> : undefined,
  }));
  const suggestions = SUGGESTIONS.filter((s) => !items.some((item) => item.toLowerCase() === s.toLowerCase()));

  function toggleCell(day: number, item: string, checked: boolean) {
    startToggleTransition(async () => {
      applyOptimisticCheck({ day, item, checked });
      let failure: string | null = null;
      try {
        const result = await setHabitTrackerCheckAction(tracker.id, { day, item, checked });
        if (!result.success) failure = result.message ?? t("Failed to update");
      } catch {
        failure = t("Failed to update");
      }
      if (failure) toast.error(failure);
      router.refresh();
    });
  }

  function addHabit(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await addTrackerItemAction(tracker.id, name);
      if (result.success) {
        toast.success(t("Habit added"));
        setNewName("");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save habit"));
        // The sheet may be out of date (a habit added/removed from another tab or
        // device) -- reload it so a stale suggestion chip / list doesn't stay.
        router.refresh();
      }
    });
  }

  function handleRemove() {
    if (removeTarget === null) return;
    const name = removeTarget;
    startTransition(async () => {
      const result = await removeTrackerItemAction(tracker.id, name);
      if (result.success) {
        toast.success(t("Habit removed"));
        setRemoveTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove habit"));
        // Most likely the habit is already gone (removed elsewhere): close the
        // dialog and reload, or every further Remove would fail the same way.
        setRemoveTarget(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5 px-6 py-8 pb-24 md:pb-8">
      <TrackerHero
        theme={RAMADAN_THEME}
        arabic="رمضان كريم"
        watermark={MoonStar}
        title={`${t("Ramadan")} ${tracker.year}`}
        subtitle={`${totalDays} ${t("days")} · ${items.length} ${t(items.length === 1 ? "habit" : "habits")}`}
        back={{ href: "/habit-tracker/habits?category=Ramadan", label: t("All Ramadans") }}
      >
        <div className="rounded-2xl bg-white/10 px-5 py-2.5 text-center backdrop-blur-sm">
          <p className={`text-[11px] font-medium ${RAMADAN_THEME.heroText}`}>{t("Progress")}</p>
          <p className="text-2xl font-semibold tabular-nums">{overallPct}%</p>
        </div>
      </TrackerHero>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-neutral-500">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 1-10 {t("Rahmah")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 11-20 {t("Maghfirah")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> 21-{totalDays} {t("Nijat")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t("Odd night of the last ten -- Laylat al-Qadr is sought in these")}
        </span>
      </div>

      {/* Side-by-side only when the whole sheet AND the summary fit (a container
          query on this wrapper, not the viewport); otherwise the summary stacks below. */}
      <div className="@container">
        <div className="flex flex-col gap-5 @min-[1600px]:flex-row @min-[1600px]:items-start">
          {/* Left column: the sheet and, right under it, the add-habit box -- so it is the
              same height as the summary beside it instead of leaving a gap. */}
          <div className="flex w-fit max-w-full min-w-0 flex-col gap-5">
            <TrackerGrid
              theme={RAMADAN_THEME}
              variant="compact"
              items={items}
              columns={columns}
              ticked={ticked}
              onToggle={toggleCell}
              chartLabel="Daily progress"
              cornerLabel="Habits"
              emptyMessage={t("No habits yet -- add one below.")}
              habitWidth="[--habit-w:9.5rem] sm:[--habit-w:13rem]"
              rowHead={({ item, index, done, pct }) => (
                <div className="flex items-start gap-2">
                  <span className="w-4 shrink-0 pt-0.5 text-xs tabular-nums text-neutral-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800" title={item}>
                      {t(item)}
                    </p>
                    <p className="text-[11px] tabular-nums text-neutral-400">
                      {done}/{totalDays} · {pct}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(item)}
                    aria-label={`${t("Remove habit")}: ${item}`}
                    title={t("Remove habit")}
                    className="shrink-0 rounded-md p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            />
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addHabit(newName);
                }}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  placeholder={t("Add a habit (e.g. Quran)")}
                  className="min-w-[14rem] flex-1 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                <button type="submit" disabled={!newName.trim() || isPending} className={RAMADAN_THEME.cta}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("Add")}
                </button>
              </form>
              {suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-400">{t("Suggestions")}</span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isPending}
                      onClick={() => addHabit(suggestion)}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
                    >
                      + {t(suggestion)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full max-w-2xl min-w-0 @min-[1600px]:max-w-none @min-[1600px]:flex-1">
            <TrackerSummary theme={RAMADAN_THEME} title="Ramadan Summary" icon={MoonStar} perfectTitle="Days when every habit was ticked" items={items} totalDays={totalDays} checks={sheet.checks} />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        isPending={isPending}
        title={t("Remove habit")}
        message={removeTarget !== null ? `${t("Remove")} "${t(removeTarget)}"? ${t("Its ticks will be deleted too.")}` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
