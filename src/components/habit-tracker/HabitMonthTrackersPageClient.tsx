"use client";

import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { HabitMonthTracker } from "@/lib/api";
import { deleteHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateMonthTrackerModal, TRACKER_MONTH_LABELS } from "./CreateMonthTrackerModal";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function withCheck(tracker: HabitMonthTracker, day: number, item: string, checked: boolean): HabitMonthTracker {
  const rest = tracker.checks.filter((c) => !(c.day === day && c.item === item));
  return { ...tracker, checks: checked ? [...rest, { day, item }] : rest };
}

// Tick = every ticked cell. Cross = unticked cells on days that have already
// passed (server's elapsedDays) -- an unticked cell today or later isn't a
// miss yet.
function countTickCross(tracker: HabitMonthTracker): { tick: number; cross: number } {
  const tick = tracker.checks.length;
  const tickInElapsed = tracker.checks.filter((c) => c.day <= tracker.elapsedDays).length;
  const cross = Math.max(0, tracker.elapsedDays * tracker.items.length - tickInElapsed);
  return { tick, cross };
}

// The vertical month sheet: one row per day, one checkbox column per item
// (the five prayers), plus that day's progress bar -- the reference's
// horizontal habits-by-days grid, turned on its side. Rows are grouped in
// weeks of 7 starting from day 1, same as the reference's WEEK 1..5 bands.
function TrackerSheet({ tracker, onToggle }: { tracker: HabitMonthTracker; onToggle: (day: number, item: string, checked: boolean) => void }) {
  const { t } = useLocale();
  const ticked = new Set(tracker.checks.map((c) => `${c.day}:${c.item}`));
  const days = Array.from({ length: tracker.totalDays }, (_, i) => i + 1);
  const totalCells = tracker.totalDays * tracker.items.length;
  const overallPct = totalCells > 0 ? Math.round((tracker.checks.length / totalCells) * 100) : 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mb-3 flex max-w-2xl items-center gap-3">
        <span className="text-xs font-medium text-neutral-500">{t("Progress")}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${overallPct}%` }} />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-neutral-500">{overallPct}%</span>
      </div>

      <div className="max-w-2xl overflow-x-auto rounded-xl border border-neutral-100 bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-xs text-neutral-500">
              <th className="px-3 py-2 text-left font-medium">{t("Day")}</th>
              {tracker.items.map((item) => (
                <th key={item} className="px-3 py-2 text-center font-medium">
                  {t(item)}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">{t("Progress")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const done = tracker.items.filter((item) => ticked.has(`${day}:${item}`)).length;
              const pct = tracker.items.length > 0 ? Math.round((done / tracker.items.length) * 100) : 0;
              const weekday = new Date(Date.UTC(tracker.year, tracker.month - 1, day)).getUTCDay();
              const isToday = tracker.todayDay === day;
              return (
                <Fragment key={day}>
                  {(day - 1) % 7 === 0 && (
                    <tr className="bg-emerald-50">
                      <td colSpan={tracker.items.length + 2} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        {t("Week")} {Math.floor((day - 1) / 7) + 1}
                      </td>
                    </tr>
                  )}
                  <tr className={`border-t border-neutral-50 ${isToday ? "bg-amber-50" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <span className="font-medium text-neutral-800">{day}</span> <span className="text-xs text-neutral-400">{t(WEEKDAY_SHORT[weekday])}</span>
                    </td>
                    {tracker.items.map((item) => {
                      const checked = ticked.has(`${day}:${item}`);
                      return (
                        <td key={item} className="px-3 py-1.5">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`${day} ${t(item)}`}
                            onClick={() => onToggle(day, item, !checked)}
                            className={`mx-auto flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                              checked ? "border-brand-primary bg-brand-primary text-white" : "border-neutral-300 bg-white hover:border-brand-primary"
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-neutral-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HabitMonthTrackersPageClient({ category, trackers }: { category: string; trackers: HabitMonthTracker[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HabitMonthTracker | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startToggleTransition] = useTransition();

  // The server props stay the single source of truth; a tick is layered on
  // top optimistically so the checkbox flips instantly, and that layer
  // disappears on its own once the transition below (PUT + router.refresh())
  // finishes -- so a failed request or a stale refresh can never leave the
  // sheet showing something the server doesn't have.
  const [optimisticTrackers, applyOptimisticCheck] = useOptimistic(
    trackers,
    (current, update: { id: string; day: number; item: string; checked: boolean }) =>
      current.map((tr) => (tr.id === update.id ? withCheck(tr, update.day, update.item, update.checked) : tr)),
  );

  function toggleCell(trackerId: string, day: number, item: string, checked: boolean) {
    startToggleTransition(async () => {
      applyOptimisticCheck({ id: trackerId, day, item, checked });
      let failure: string | null = null;
      try {
        const result = await setHabitTrackerCheckAction(trackerId, { day, item, checked });
        if (!result.success) failure = result.message ?? t("Failed to update");
      } catch {
        failure = t("Failed to update");
      }
      if (failure) toast.error(failure);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteHabitTrackerAction(target.id);
      if (result.success) {
        toast.success(t("Month tracker removed"));
        setDeleteTarget(null);
        if (expandedId === target.id) setExpandedId(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove month tracker"));
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t(category)}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Track your five daily prayers, month by month.")}</p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Create Month")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{t("Month")}</th>
              <th className="px-4 py-3">{t("Year")}</th>
              <th className="px-4 py-3">{t("Total Days")}</th>
              <th className="px-4 py-3">{t("Tick")}</th>
              <th className="px-4 py-3" title={t("Prayers not ticked on days that have already passed")}>
                {t("Cross")}
              </th>
              <th className="px-4 py-3 text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {optimisticTrackers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                  {t('No months yet -- click "Create Month" to start tracking.')}
                </td>
              </tr>
            )}
            {optimisticTrackers.map((tracker, index) => {
              const { tick, cross } = countTickCross(tracker);
              const expanded = expandedId === tracker.id;
              return (
                <Fragment key={tracker.id}>
                  <tr className="cursor-pointer border-t border-neutral-50 hover:bg-neutral-50" onClick={() => setExpandedId(expanded ? null : tracker.id)}>
                    <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <button type="button" aria-expanded={expanded} className="flex items-center gap-1.5 font-medium text-neutral-800">
                        {expanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                        {t(TRACKER_MONTH_LABELS[tracker.month - 1])}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{tracker.year}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{tracker.totalDays}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-emerald-600">{tick}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-brand-danger">{cross}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(tracker);
                          }}
                          title={t("Delete")}
                          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50/60">
                        <TrackerSheet tracker={tracker} onToggle={(day, item, checked) => toggleCell(tracker.id, day, item, checked)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateMonthTrackerModal open={formOpen} onClose={() => setFormOpen(false)} category={category} onCreated={(id) => setExpandedId(id)} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Month Tracker")}
        message={deleteTarget ? `${t("Remove the tracker for")} ${t(TRACKER_MONTH_LABELS[deleteTarget.month - 1])} ${deleteTarget.year}?` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
