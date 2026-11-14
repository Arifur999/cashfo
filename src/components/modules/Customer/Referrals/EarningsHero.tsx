"use client";

import { ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { formatCurrency } from "@/lib/customer/currency";
import { balancesOf, dayOf, programOf } from "@/lib/customer/referralDisplay";
import type { ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const WITHDRAW_ROUTE = "/referrals/withdraw";
export const WITHDRAWALS_ROUTE = "/referrals/withdrawals";
const EARNINGS = "/referrals/earnings";

interface EarningsHeroProps {
  info: ReferralProgramInfo;
  currency: string;
  // The app's "YYYY-MM-DD", for the days it names.
  today: string;
}

// The hero's ground is the forest gradient in both themes; the button is the
// card colour with the brand ink (white and forest, dark surface and mint),
// as the board draws it, and a mint focus ring, which shows on the forest where the
// page's emerald one hardly does. Off, it fades to 55% as the board draws
// it; the line under the amount says why.
const ON_FOREST =
  "bg-white text-emerald hover:bg-mint-50 dark:bg-surface dark:text-brand-ink dark:hover:bg-surface-sunken focus-visible:outline-mint-200 disabled:opacity-55 disabled:hover:bg-white dark:disabled:hover:bg-surface";

const DAY_MS = 86_400_000;

// What is ready to withdraw, in the deep green, with what is on hold, this
// month's earnings, everything earned and what has been paid to the member
// (ReferralDashboard); phones get the shorter card with the figures on one
// line and a full-width Withdraw (ReferralMobile). Below the smallest
// withdrawal Withdraw rests, and the line under the amount says so.
export function EarningsHero({ info, currency, today }: EarningsHeroProps) {
  const { t, fmt } = useLocale();
  const reasonId = useId();
  const program = programOf(info);
  const balances = balancesOf(info);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const canWithdraw = balances.available >= program.minWithdrawal && balances.available > 0;
  const thisMonth = info.months.at(-1);
  const holdNext = dayOf(balances.onHoldNextAt);
  const daysToHold = holdNext ? Math.max(0, Math.round((Date.parse(`${holdNext}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS)) : 0;
  const since = dayOf(info.firstEarnedAt);
  const monthName = (day: string, withYear: boolean) => formatDate(`${day}T06:00:00Z`, withYear ? "MMMM yyyy" : "MMMM", "", fmt);

  const methodsLine = t(program.fee > 0 ? "To bKash, Nagad, Rocket or your bank · from {min} · {fee} fee" : "To bKash, Nagad, Rocket or your bank · from {min} · no fee", {
    min: money(program.minWithdrawal),
    fee: money(program.fee),
  });
  const line = canWithdraw ? methodsLine : t("You can withdraw from {min}.", { min: money(program.minWithdrawal) });

  // Each figure opens what it counts: the lines on hold, this month's,
  // every line, the withdrawals.
  const stats: { label: string; value: string; sub: string; href: string }[] = [
    {
      label: t("On hold"),
      value: money(balances.onHold),
      sub: balances.onHold <= 0 ? t("Nothing waiting") : daysToHold <= 1 ? t("Ready tomorrow") : t("Ready in {count} days", { count: formatCount(daysToHold, fmt) }),
      href: `${EARNINGS}?status=ON_HOLD`,
    },
    {
      label: t("This month"),
      value: money(thisMonth?.amount ?? 0),
      sub: monthName(`${today.slice(0, 7)}-15`, false),
      href: `${EARNINGS}?month=${Number(today.slice(5, 7))}&year=${today.slice(0, 4)}`,
    },
    {
      label: t("Total earned"),
      value: money(balances.lifetime),
      sub: since ? t("Since {month}", { month: monthName(since, since.slice(0, 4) !== today.slice(0, 4)) }) : t("Nothing yet"),
      href: EARNINGS,
    },
    {
      label: t("Paid to you"),
      value: money(balances.paidOut),
      sub: t("See withdrawals"),
      href: WITHDRAWALS_ROUTE,
    },
  ];

  const withdraw = (phone: boolean) => {
    const className = cn(
      "flex shrink-0 items-center justify-center gap-2 font-bold whitespace-nowrap shadow-[0_6px_16px_rgba(18,32,29,0.18)] transition-colors",
      ON_FOREST,
      phone ? "h-12 w-full rounded-xl text-[15px]" : "h-11 rounded-full px-5 text-[15px]",
    );
    const content = (
      <>
        <ArrowDownToLine className="size-4.25" strokeWidth={2.25} aria-hidden="true" />
        {t("Withdraw@@referral")}
      </>
    );
    return canWithdraw ? (
      <Link href={WITHDRAW_ROUTE} className={className}>
        {content}
      </Link>
    ) : (
      <button type="button" disabled aria-describedby={reasonId} className={className}>
        {content}
      </button>
    );
  };

  return (
    <section aria-labelledby="rf-earn" className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-referral-hero p-4.5 text-white md:gap-4.5 md:px-6 md:py-5.5">
      <span aria-hidden="true" className="absolute -top-15 -right-12.5 size-42.5 rounded-full border border-white/14 md:-top-20 md:-right-15 md:size-55" />
      <span aria-hidden="true" className="absolute -top-7.5 right-7.5 hidden size-35 rounded-full border border-white/10 md:block" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3 md:gap-1">
          <h2 id="rf-earn" className="text-[13px] leading-[normal] font-medium text-white/86 md:text-body">
            {t("Ready to withdraw")}
          </h2>
          <span className="text-[32px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums md:text-[40px]">{money(balances.available)}</span>
          <span id={reasonId} className="hidden text-[13px] leading-[normal] text-white/84 md:block">
            {line}
          </span>
        </div>
        <span className="hidden md:flex">{withdraw(false)}</span>
      </div>

      {/* Phones: the figures on one line, then Withdraw across the card. */}
      <div className="relative flex flex-wrap gap-x-4.5 gap-y-1 text-[12.5px] leading-[normal] text-white/86 tabular-nums md:hidden">
        <span>
          {t("On hold")} <b className="font-bold text-white">{money(balances.onHold)}</b>
        </span>
        <span>
          {t("Earned")} <b className="font-bold text-white">{money(balances.lifetime)}</b>
        </span>
        <span>
          {t("Paid@@short")} <b className="font-bold text-white">{money(balances.paidOut)}</b>
        </span>
      </div>
      {!canWithdraw && <p className="relative text-[12.5px] leading-[normal] text-white/84 md:hidden">{line}</p>}
      <div className="relative md:hidden">{withdraw(true)}</div>

      <div className="relative hidden grid-cols-4 gap-3 border-t border-white/18 pt-4 md:grid">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group flex min-w-0 flex-col items-start gap-0.75 rounded-sm focus-visible:outline-mint-200">
            <span className="text-[12.5px] leading-[normal] text-white/80">{stat.label}</span>
            <span className="text-[19px] leading-[normal] font-bold tabular-nums">{stat.value}</span>
            <span className="text-caption leading-[normal] text-white/75 underline decoration-white/35 underline-offset-3 group-hover:decoration-white">{stat.sub}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
