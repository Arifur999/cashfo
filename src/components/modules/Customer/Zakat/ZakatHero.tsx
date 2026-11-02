"use client";

import { Fragment } from "react";
import { formatDay } from "@/lib/date";
import { NISAB_GOLD_VORI, NISAB_SILVER_VORI, partsLine } from "@/lib/customer/zakatDisplay";
import type { ZakatSummary } from "@/lib/customer/zakatTypes";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

interface ZakatHeroProps {
  summary: ZakatSummary;
  money: (value: number | string) => string;
  onHow: () => void;
}

// The year's zakat (board: Zakat's hero): the amount and how it is made
// (what you have + owed to you − you owe = due on × 2.5%), what is given and
// left; on the right the date to give it by with the monthly parts, and
// whether what you own reaches nisab.
export function ZakatHero({ summary, money, onHow }: ZakatHeroProps) {
  const { t, fmt } = useLocale();
  const { totals } = summary;
  const zakat = Number(totals.zakat);
  const paid = Number(totals.paid);
  const left = Number(totals.left);
  const above = summary.aboveNisab;
  const paidPct = zakat > 0 ? Math.min(100, Math.round((paid / zakat) * 100)) : 0;
  // What you have, with this year's zakat given counted back (see the summary).
  const have = Number(totals.have) + Number(totals.givenBack);
  const formula: { label: string; amount: string; op?: string; key?: boolean }[] = [
    { label: "What you have", amount: money(have) },
    { op: "+", label: "Owed to you", amount: money(totals.owed) },
    { op: "−", label: "You owe", amount: money(totals.owe) },
    { op: "=", label: "Zakat is due on", amount: money(totals.net), key: true },
    { op: "×", label: "Rate", amount: `${toLocaleDigits("2.5", fmt)}%` },
  ];
  const basisSilver = summary.settings.basis === "SILVER";
  const nisabWords = basisSilver
    ? t("{vori} vori silver = {amount} today", { vori: toLocaleDigits(String(NISAB_SILVER_VORI), fmt), amount: money(summary.nisab) })
    : t("{vori} vori gold = {amount} today", { vori: toLocaleDigits(String(NISAB_GOLD_VORI), fmt), amount: money(summary.nisab) });

  return (
    <section aria-labelledby="zk-hero" className="relative grid overflow-hidden rounded-[20px] bg-zakat-hero text-white shadow-float lg:grid-cols-[minmax(0,1fr)_330px]">
      <span aria-hidden="true" className="absolute -top-25 -right-17.5 size-65 rounded-full border-40 border-hero-sage opacity-10" />
      <div className="relative flex min-w-0 flex-col gap-2.5 px-5 py-5 md:px-6.5 md:py-5.5">
        <h2 id="zk-hero" className="text-[13px] font-semibold text-hero-sage">
          {t(above ? "Your zakat this year" : "No zakat due this year")}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[34px] leading-[1.05] font-bold tracking-[-0.02em] tabular-nums md:text-[40px]">{money(zakat)}</span>
          <span className="text-[14.5px] text-hero-mist">{t(above ? "2.5% of what you own after debts" : "What you own after debts is below nisab")}</span>
        </div>
        <ul aria-label={t("How the number is made")} className="mt-1 flex flex-wrap items-center gap-2">
          {formula.map((part) => (
            <Fragment key={part.label}>
              {part.op && (
                <li aria-hidden="true" className="text-[18px] font-semibold text-hero-mint">
                  {part.op}
                </li>
              )}
              <li className={cn("flex flex-col gap-px rounded-xl border border-white/14 px-3 py-2", part.key ? "bg-hero-mint/18" : "bg-white/8")}>
                <span className="text-[11.5px] whitespace-nowrap text-hero-sage">{t(part.label)}</span>
                <span className="text-[14.5px] font-bold whitespace-nowrap tabular-nums">{part.amount}</span>
              </li>
            </Fragment>
          ))}
        </ul>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <div
            role="progressbar"
            aria-label={t("Zakat given")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={paidPct}
            className="h-2 max-w-105 min-w-40 flex-1 overflow-hidden rounded-full bg-white/18"
          >
            <div className="h-full rounded-full bg-hero-mint transition-[width]" style={{ width: `${paidPct}%` }} />
          </div>
          <span className="text-[12.5px] text-hero-mist">
            {zakat > 0
              ? left > 0
                ? t("{paid} given · {left} left", { paid: money(paid), left: money(left) })
                : t("All given. May Allah accept it.")
              : t("Nothing to give this year")}
          </span>
        </div>
      </div>
      <div className="relative flex flex-col border-white/12 max-lg:border-t lg:border-l">
        <div className="flex flex-col gap-1 border-b border-white/12 px-5.5 pt-4.5 pb-3.5">
          <span className="text-[12.5px] font-semibold text-hero-sage">{t("Give it by")}</span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[20px] font-bold">{formatDay(summary.dueDate, "d MMM yyyy", fmt)}</span>
            <span className="text-[12.5px] text-hero-mist">{plural(t, summary.daysLeft, "{count} day left", "{count} days left", undefined, fmt)}</span>
          </span>
          <span className="text-[12.5px] leading-[1.45] text-hero-mist">{partsLine(summary, money, t, fmt)}</span>
        </div>
        <div className="flex flex-col gap-1.5 px-5.5 pt-3.5 pb-4.5">
          <span className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-hero-sage">{t("Nisab")}</span>
            <span className={cn("inline-flex h-5.5 items-center rounded-full px-2.25 text-[11.5px] font-bold", above ? "bg-hero-mint text-hero-ink" : "bg-night-amber text-night-ink")}>
              {t(above ? "You are above it" : "You are below it")}
            </span>
          </span>
          <span className="text-[12.5px] leading-normal text-hero-mist">{nisabWords}</span>
          <button type="button" onClick={onHow} className="self-start rounded-sm text-[12.5px] font-semibold text-hero-mint hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white pointer-coarse:min-h-11">
            {t("What is nisab?")}
          </button>
        </div>
      </div>
    </section>
  );
}
