"use client";

import { Flame, GraduationCap, Moon } from "lucide-react";
import { createElement } from "react";
import Card from "@/components/smartly/Card";
import { budgetCategoryHex, budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import type { StreakRow } from "@/lib/customer/habitsHome";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface StreaksCardProps {
  rows: StreakRow[];
}

// Every run that is alive, longest first: habits, skills practice and the
// five prayers.
export function StreaksCard({ rows }: StreaksCardProps) {
  const { t } = useLocale();
  const max = Math.max(1, ...rows.map((row) => row.days));

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Streaks")}</h2>
        <span className="text-caption text-ink-muted">{t("days in a row")}</span>
      </div>
      {rows.length === 0 ? (
        <span className="py-3 text-small text-ink-muted">{t("Tick things off two days running and the streaks show up here.")}</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const tone = row.kind === "habit" && row.color ? categoryTone(row.color) : null;
            const bar = row.kind === "habit" && row.color ? budgetCategoryHex(row.color) : undefined;
            return (
              <li key={row.key} className="grid h-9.5 grid-cols-[28px_minmax(0,1fr)_52px] items-center gap-3">
                <span className={cn("flex size-7 items-center justify-center rounded-md [&_svg]:size-3.5", tone ? cn(tone.bg, tone.fg) : row.kind === "skills" ? "bg-pillar-habits-soft text-pillar-habits" : "bg-mint-50 text-emerald")}>
                  {row.kind === "habit" && row.icon ? createElement(budgetCategoryIcon(row.icon), { "aria-hidden": true }) : row.kind === "skills" ? <GraduationCap aria-hidden="true" /> : <Moon aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-small font-medium text-ink">{row.kind === "habit" ? row.name : t(row.name)}</span>
                  <span className="h-1.25 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={cn("block h-full rounded-full", !bar && (row.kind === "skills" ? "bg-pillar-habits" : "bg-emerald"))} style={{ width: `${Math.round((row.days / max) * 100)}%`, background: bar }} />
                  </span>
                </span>
                <span className="flex items-center justify-end gap-1 text-body font-bold text-ink tabular-nums">
                  <Flame className="size-3.5 text-warning" aria-hidden="true" />
                  {row.days}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
