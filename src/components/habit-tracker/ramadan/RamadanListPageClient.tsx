"use client";

import { MoonStar, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { HabitMonthTracker } from "@/lib/api";
import { deleteHabitTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateRamadanModal } from "./CreateRamadanModal";
import { RAMADAN_GOLD_BUTTON, RamadanHero } from "./RamadanHero";

// Habits -> Ramadan: a themed banner with "Create Ramadan", then one card per
// created Ramadan ("Ramadan 2026"). A card opens that year's sheet on its
// own page. Like Namaz's months, a Ramadan can only be deleted while nothing
// is ticked (the server enforces it too).
export function RamadanListPageClient({ trackers }: { trackers: HabitMonthTracker[] }) {
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
        toast.success(t("Ramadan removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove Ramadan"));
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <RamadanHero title={t("Ramadan")} subtitle={t("Track your Ramadan, day by day.")}>
        <button type="button" onClick={() => setFormOpen(true)} className={RAMADAN_GOLD_BUTTON}>
          <Plus className="h-4 w-4" /> {t("Create Ramadan")}
        </button>
      </RamadanHero>

      {trackers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-sm shadow-black/5">
          <MoonStar className="mb-3 h-10 w-10 text-amber-400" />
          <p className="text-sm text-neutral-400">{t('No Ramadan yet -- click "Create Ramadan" to start.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trackers.map((tracker) => {
            const ticks = tracker.checks.length;
            const cells = tracker.totalDays * tracker.items.length;
            const pct = cells > 0 ? Math.round((ticks / cells) * 100) : 0;
            const locked = ticks > 0;
            return (
              <div key={tracker.id} className="relative">
                <Link
                  href={`/habit-tracker/habits/ramadan/${tracker.id}`}
                  className="block overflow-hidden rounded-2xl border border-amber-200/50 bg-surface shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative bg-gradient-to-r from-emerald-900 to-indigo-950 px-5 py-4 text-white">
                    <MoonStar aria-hidden className="pointer-events-none absolute -right-2 -top-3 h-20 w-20 text-amber-200/15" />
                    <p className="text-xs font-medium text-amber-200/90">
                      {tracker.totalDays} {t("days")}
                    </p>
                    <h2 className="text-lg font-semibold">
                      {t("Ramadan")} {tracker.year}
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        {tracker.items.length} {t(tracker.items.length === 1 ? "habit" : "habits")}
                      </span>
                      <span className="font-semibold tabular-nums text-neutral-700">{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
                {/* A sibling of the Link, not nested inside it (a button inside a link is invalid). */}
                <button
                  type="button"
                  aria-disabled={locked}
                  onClick={() => {
                    if (locked) {
                      toast.error(t("Can't delete a Ramadan that has ticks -- untick them all first"));
                      return;
                    }
                    setDeleteTarget(tracker);
                  }}
                  title={locked ? t("Can't delete a Ramadan that has ticks -- untick them all first") : t("Delete")}
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

      <CreateRamadanModal open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Ramadan")}
        message={deleteTarget ? `${t("Remove")} ${t("Ramadan")} ${deleteTarget.year}?` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
