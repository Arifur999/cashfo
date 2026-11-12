"use client";

import { ArrowRight, Calendar } from "lucide-react";
import type { SavingsGoal } from "@/lib/customer/api";
import { isBehind, type GoalsHero } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface SavingsSummaryProps {
  hero: GoalsHero;
  // The active goals, one pace bar each.
  active: SavingsGoal[];
  // "October"
  month: string;
  money: (value: number | string) => string;
  onShowBehind: () => void;
}

const CARD = "flex flex-col justify-center gap-2.5 rounded-[20px] border border-line-card bg-surface px-5.5 py-5 shadow-card";

// Savings goals' three cards (SavingsDashboard board): what all goals have
// saved, on the brand's green; what this month got of what it needed; and
// how many active goals are on their plan, a bar each, with the way to the
// ones behind.
export function SavingsSummary({ hero, active, month, money, onShowBehind }: SavingsSummaryProps) {
  const { t, fmt } = useLocale();
  const percent = `${formatCount(hero.percent, fmt)}%`;
  const monthPercent = `${formatCount(hero.monthPercent, fmt)}%`;

  return (
    <section aria-label={t("Savings summary")} className="grid gap-4 md:grid-cols-[1.35fr_1fr_0.85fr]">
      <div className="relative flex items-center gap-5 overflow-hidden rounded-[20px] bg-linear-135 from-emerald to-forest px-6 py-5 text-white shadow-[0_10px_28px_rgba(15,63,56,0.22)]">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" className="absolute -right-17.5 -bottom-27.5 opacity-12">
          <circle cx="110" cy="110" r="84" fill="none" stroke="currentColor" strokeWidth="26" />
        </svg>
        <div
          role="img"
          aria-label={t("{percent}% of all goals saved", { percent: formatCount(hero.percent, fmt) })}
          className="relative flex size-26 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(white 0 ${hero.percent}%, rgb(255 255 255 / 0.18) ${hero.percent}% 100%)` }}
        >
          <span className="flex size-20 flex-col items-center justify-center rounded-full bg-forest">
            <span className="text-[22px] leading-[normal] font-bold">{percent}</span>
            <span className="text-[10.5px] text-white/75">{t("of all goals")}</span>
          </span>
        </div>
        <div className="relative flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-semibold tracking-[0.06em] text-white/75 uppercase">{t("Saved so far")}</span>
          <span className="text-[30px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{money(hero.saved)}</span>
          <span className="text-[13px] text-pretty text-white/85 tabular-nums">{fillNodes(t("of {total} · {left} to go"), { total: money(hero.target), left: <b className="font-bold text-white">{money(hero.toGo)}</b> })}</span>
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
            <span className="flex size-7 items-center justify-center rounded-[9px] bg-emerald-soft text-emerald">
              <Calendar className="size-3.75" strokeWidth={2} aria-hidden="true" />
            </span>
            {t("Saved in {month}", { month })}
          </span>
          <span className="rounded-full bg-emerald-soft px-2.25 py-0.5 text-[12px] font-bold text-emerald tabular-nums">{monthPercent}</span>
        </div>
        <span className="text-[13px] font-medium text-ink-muted tabular-nums">
          {fillNodes(t("{saved} of {target}"), { saved: <span className="text-[24px] leading-[normal] font-bold text-ink">{money(hero.monthSaved)}</span>, target: money(hero.monthTarget) })}
        </span>
        <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          <span className="block h-full rounded-full bg-emerald" style={{ width: `${hero.monthPercent}%` }} />
        </span>
        <span className="text-[12px] text-ink-muted">
          {hero.active ? t(hero.active === 1 ? "{got} of {count} active goal got money in {month}" : "{got} of {count} active goals got money in {month}", { got: formatCount(hero.gotMoney, fmt), count: formatCount(hero.active, fmt), month }) : t("No active goals yet")}
        </span>
      </div>

      <div className={CARD}>
        <span className="text-[13px] font-semibold text-ink-soft">{t("On pace")}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[30px] leading-[normal] font-bold tracking-[-0.02em] text-ink">{hero.active ? formatCount(hero.active - hero.behind, fmt) : "–"}</span>
          {hero.active > 0 && <span className="text-[13px] text-ink-muted">{t("of {count} active", { count: formatCount(hero.active, fmt) })}</span>}
        </span>
        {active.length > 0 && (
          <div className="flex gap-1.25" aria-hidden="true">
            {active.map((goal) => (
              <span key={goal.id} title={`${goal.name} · ${isBehind(goal) ? t("behind") : t("on pace")}`} className={cn("h-2 flex-1 rounded-full", isBehind(goal) ? "bg-warning-fill" : "bg-success")} />
            ))}
          </div>
        )}
        {hero.behind > 0 ? (
          <button type="button" onClick={onShowBehind} className="inline-flex h-7 items-center gap-1.5 self-start rounded-full bg-warning-soft px-2.5 text-[12px] font-bold text-warning-ink hover:bg-warning-line pointer-coarse:h-11">
            {t(hero.behind === 1 ? "{count} goal is behind plan" : "{count} goals are behind plan", { count: formatCount(hero.behind, fmt) })}
            <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
          </button>
        ) : (
          <span className="inline-flex h-7 items-center self-start rounded-full bg-success-soft px-2.5 text-[12px] font-bold text-success-ink">
            {hero.active ? t("Every active goal is on plan") : t("No active goals yet")}
          </span>
        )}
      </div>
    </section>
  );
}
