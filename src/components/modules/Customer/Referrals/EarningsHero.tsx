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
// was ever earned and what has been paid out.
export function EarningsHero({ info, currency, canWithdraw, onWithdraw }: EarningsHeroProps) {
  const { t } = useLocale();
  const pending = info.recentReferrals.filter((entry) => entry.status === "PENDING").length;
  const stats = [
    { label: t("Pending"), value: formatCurrency(info.pendingEarnings, currency), sub: pending > 0 ? `${pending} ${t(pending === 1 ? "friend, 30 days after joining" : "friends, 30 days after joining")}` : t("Nothing waiting") },
    { label: t("Total earned"), value: formatCurrency(info.totalEarned, currency), sub: `${info.referralCount} ${t(info.referralCount === 1 ? "friend joined" : "friends joined")}` },
    { label: t("Paid out"), value: formatCurrency(paidOut(info), currency), sub: t("Withdrawn to your wallets") },
  ];

  return (
    <section aria-labelledby="earn-title" className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--emerald)_0%,var(--forest)_100%)] p-6 text-white">
      <span aria-hidden="true" className="absolute -top-20 -right-15 size-55 rounded-full border border-white/14" />
      <span aria-hidden="true" className="absolute -top-7.5 right-7.5 size-35 rounded-full border border-white/10" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="earn-title" className="text-body font-medium text-white/86">
            {t("Available to withdraw")}
          </h2>
          <span className="text-display text-white tabular-nums">{formatCurrency(info.availableBalance, currency)}</span>
          <span className="text-small text-white/84">{t("To any of your wallets or savings pots · no fee")}</span>
        </div>
        <Button size="lg" onClick={onWithdraw} disabled={!canWithdraw || Number(info.availableBalance) <= 0} className="bg-white text-emerald shadow-[0_6px_16px_rgba(14,26,22,0.18)] hover:bg-mint-50 disabled:opacity-70">
          <ArrowDownToLine />
          {t("Withdraw")}
        </Button>
      </div>
      <div className="relative grid grid-cols-3 gap-3 border-t border-white/18 pt-4">
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
