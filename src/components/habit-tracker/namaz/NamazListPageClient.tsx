"use client";

import { Moon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { HabitMonthTracker } from "@/lib/api";
import { deleteHabitTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateMonthTrackerModal, TRACKER_MONTH_LABELS } from "../CreateMonthTrackerModal";
import { NAMAZ_THEME } from "../tracker/theme";
import { TrackerHero } from "../tracker/TrackerHero";
import { countTickCross } from "./namazStats";

// Habits -> Namaz: a themed banner with "Create Month", then one card per
// created month ("September 2026"). A card opens that month's sheet on its
// own page. A month can only be deleted while nothing is ticked (the server
// enforces it too).
export function NamazListPageClient({ trackers }: { trackers: HabitMonthTracker[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HabitMonthTracker | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteHabitTrackerAction(target.id);
      if (result.success) {
        toast.success(t("Month tracker removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove month tracker"));
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <TrackerHero theme={NAMAZ_THEME} arabic="الصلاة" watermark={Moon} title={t("Namaz")} subtitle={t("Track your five daily prayers, month by month.")}>
        <button type="button" onClick={() => setFormOpen(true)} className={NAMAZ_THEME.cta}>
          <Plus className="h-4 w-4" /> {t("Create Month")}
        </button>
      </TrackerHero>

      {trackers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-sm shadow-black/5">
          <Moon className={`mb-3 h-10 w-10 ${NAMAZ_THEME.emptyIcon}`} />
          <p className="text-sm text-neutral-400">{t('No months yet -- click "Create Month" to start tracking.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trackers.map((tracker) => {
            const { tick, cross } = countTickCross(tracker);
            const cells = tracker.totalDays * tracker.items.length;
            const pct = cells > 0 ? Math.round((tick / cells) * 100) : 0;
            const locked = tick > 0;
            const monthName = t(TRACKER_MONTH_LABELS[tracker.month - 1]);
            return (
              <div key={tracker.id} className="relative">
                <Link
                  href={`/habit-tracker/habits/namaz/${tracker.id}`}
                  className={`block overflow-hidden rounded-2xl border ${NAMAZ_THEME.cardBorder} bg-surface shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className={`relative bg-gradient-to-r ${NAMAZ_THEME.cardHeader} px-5 py-4 text-white`}>
                    <Moon aria-hidden className={`pointer-events-none absolute -right-2 -top-3 h-20 w-20 ${NAMAZ_THEME.heroWatermark}`} />
                    <p className={`text-xs font-medium ${NAMAZ_THEME.cardSub}`}>
                      {tracker.totalDays} {t("days")}
                    </p>
                    <h2 className="text-lg font-semibold">
                      {monthName} {tracker.year}
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                      <span className="flex items-center gap-3">
                        <span>
                          {t("Tick")} <b className="tabular-nums text-emerald-600">{tick}</b>
                        </span>
                        <span title={t("Prayers not ticked on days that have already passed")}>
                          {t("Cross")} <b className="tabular-nums text-brand-danger">{cross}</b>
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-neutral-700">{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${NAMAZ_THEME.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
                {/* A sibling of the Link, not nested inside it (a button inside a link is invalid).
                    aria-disabled, not disabled, so clicking it can still explain why. */}
                <button
                  type="button"
                  aria-disabled={locked}
                  aria-label={`${t("Delete")} ${monthName} ${tracker.year}`}
                  onClick={() => {
                    if (locked) {
                      toast.error(t("Can't delete a month that has ticks -- untick them all first"));
                      return;
                    }
                    setDeleteTarget(tracker);
                  }}
                  title={locked ? t("Can't delete a month that has ticks -- untick them all first") : t("Delete")}
                  className={`absolute right-3 top-3 rounded-lg p-1.5 transition-colors ${
                    locked ? "cursor-not-allowed text-white/30" : "text-white/70 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CreateMonthTrackerModal open={formOpen} onClose={() => setFormOpen(false)} />
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
