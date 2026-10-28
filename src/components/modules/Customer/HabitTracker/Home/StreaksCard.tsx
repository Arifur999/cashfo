"use client";

import { BookOpen, Flame, GraduationCap } from "lucide-react";
import { createElement } from "react";
import Card from "@/components/smartly/Card";
import { MosqueIcon } from "@/components/smartly/icons";
import { budgetCategoryHex, budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import type { StreakRow } from "@/lib/customer/habitsHome";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The fixed looks of the streaks that aren't a habit's own.
const FIXED = {
  skills: { tile: "bg-warning-soft text-warning", bar: "bg-warning", icon: GraduationCap },
  reading: { tile: "bg-orange-soft text-orange", bar: "bg-orange", icon: BookOpen },
  prayers: { tile: "bg-income-soft text-income", bar: "bg-income", icon: MosqueIcon },
};

interface StreaksCardProps {
  rows: StreakRow[];
}

// Every run that is alive, longest first: habits, skills practice and the
// five prayers.
export function StreaksCard({ rows }: StreaksCardProps) {
  const { t, fmt } = useLocale();
  const max = Math.max(1, ...rows.map((row) => row.days));

  return (
    <Card padding="none" className="flex flex-col gap-2.5 rounded-md px-5 pt-4.5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Streaks")}</h2>
        <span className="text-caption text-ink-muted">{t("days in a row")}</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
            <Flame className="size-5" aria-hidden="true" />
          </span>
          <span className="max-w-60 text-small text-ink-muted">{t("Tick something today and again tomorrow to start a streak.")}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => {
            const tone = row.kind === "habit" && row.color ? categoryTone(row.color) : null;
            const bar = row.kind === "habit" && row.color ? budgetCategoryHex(row.color) : undefined;
            const fixed = row.kind === "habit" ? FIXED.prayers : FIXED[row.kind];
            return (
              <li key={row.key} className="grid h-9.5 grid-cols-[28px_minmax(0,1fr)_52px] items-center gap-2.5">
                <span className={cn("flex size-7 items-center justify-center rounded-sm [&_svg]:size-3.75", tone ? cn(tone.bg, tone.fg) : fixed.tile)}>
                  {createElement(row.kind === "habit" && row.icon ? budgetCategoryIcon(row.icon) : fixed.icon, { "aria-hidden": true })}
                </span>
                <span className="flex min-w-0 flex-col gap-1.25">
                  <span className="truncate text-small font-medium text-ink">{row.kind === "habit" ? row.name : t(row.name)}</span>
                  <span className="h-1.25 overflow-hidden rounded-full bg-surface-sunken dark:bg-line">
                    <span className={cn("block h-full rounded-full", !bar && fixed.bar)} style={{ width: `${Math.round((row.days / max) * 100)}%`, background: bar }} />
                  </span>
                </span>
                <span className="flex items-center justify-end gap-1 text-body font-bold text-ink tabular-nums">
                  <Flame className="size-3.25 text-orange-fill" aria-hidden="true" />
                  {formatCount(row.days, fmt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
