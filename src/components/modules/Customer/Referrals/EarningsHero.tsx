"use client";

import { ArrowDownToLine } from "lucide-react";
import Button from "@/components/smartly/Button";
import type { ReferralInfo } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { paidOut } from "@/lib/customer/referralDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EarningsHeroProps {
  info: ReferralInfo;
  currency: string;
  canWithdraw: boolean;
  onWithdraw: () => void;
}

// What is ready to withdraw, in the deep green, with what is pending, what
// was ever earned and what has been paid out. Phones get the board's
// shorter card: the three on one line and a full-width Withdraw, with the
// board's natural line heights (a taka sign stands its line taller).
export function EarningsHero({ info, currency, canWithdraw, onWithdraw }: EarningsHeroProps) {
  const { t } = useLocale();
  const pending = info.recentReferrals.filter((entry) => entry.status === "PENDING").length;
  const canPress = canWithdraw && Number(info.availableBalance) > 0;
  const stats = [
    { label: t("Pending"), value: formatCurrency(info.pendingEarnings, currency), sub: pending > 0 ? `${pending} ${t(pending === 1 ? "friend, 30 days after joining" : "friends, 30 days after joining")}` : t("Nothing waiting") },
    { label: t("Total earned"), value: formatCurrency(info.totalEarned, currency), sub: `${info.referralCount} ${t(info.referralCount === 1 ? "friend joined" : "friends joined")}` },
    { label: t("Paid out"), value: formatCurrency(paidOut(info), currency), sub: t("Withdrawn to your wallets") },
  ];

  return (
    <section aria-labelledby="earn-title" className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--emerald)_0%,var(--forest)_100%)] p-5 text-white md:gap-4 md:p-6">
      <span aria-hidden="true" className="absolute -top-15 -right-12.5 size-42.5 rounded-full border border-white/14 md:-top-20 md:-right-15 md:size-55" />
      <span aria-hidden="true" className="absolute -top-7.5 right-7.5 hidden size-35 rounded-full border border-white/10 md:block" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3 md:gap-1">
          <h2 id="earn-title" className="text-small font-medium text-white/86 max-md:leading-[normal] md:text-body">
            {t("Available to withdraw")}
          </h2>
          <span className="text-display text-white tabular-nums max-md:leading-[normal] max-md:font-bold">{formatCurrency(info.availableBalance, currency)}</span>
          <span className="text-small text-white/84 max-md:hidden">{t("To any of your wallets or savings pots · no fee")}</span>
        </div>
        <Button size="lg" onClick={onWithdraw} disabled={!canPress} className="bg-white text-emerald shadow-[0_6px_16px_rgba(14,26,22,0.18)] hover:bg-mint-50 disabled:opacity-70 max-md:hidden">
          <ArrowDownToLine />
          {t("Withdraw")}
        </Button>
      </div>
      <div className="relative flex gap-4 text-small leading-[normal] text-white/86 tabular-nums md:hidden">
        <span>
          {t("Pending")} <b className="text-white">{formatCurrency(info.pendingEarnings, currency)}</b>
        </span>
        <span>
          {t("Earned")} <b className="text-white">{formatCurrency(info.totalEarned, currency)}</b>
        </span>
        <span>
          {t("Paid@@payout")} <b className="text-white">{formatCurrency(paidOut(info), currency)}</b>
        </span>
      </div>
      <Button size="xl" onClick={onWithdraw} disabled={!canPress} className="relative w-full rounded-lg bg-white text-body-lg font-bold text-emerald hover:bg-mint-50 disabled:opacity-70 md:hidden">
        <ArrowDownToLine />
        {t("Withdraw")}
      </Button>
      <div className="relative hidden grid-cols-3 gap-3 border-t border-white/18 pt-4 md:grid">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.75">
            <span className="text-small text-white/80">{stat.label}</span>
            <span className="text-h2 font-bold text-white tabular-nums">{stat.value}</span>
            <span className="text-caption text-white/75">{stat.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
