"use client";

import { ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { formatCurrency } from "@/lib/customer/currency";
import { balancesOf, dayOf, earningSince, friendDay, programOf } from "@/lib/customer/referralDisplay";
import type { ReferralFriend, ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const WITHDRAW_ROUTE = "/referrals/withdraw";

interface EarningsHeroProps {
  info: ReferralProgramInfo;
  friends: ReferralFriend[];
  currency: string;
  // The app's "YYYY-MM-DD", for the days it names.
  today: string;
}

// The hero's ground is the forest gradient in both themes, so the button
// takes colours that don't change in dark either (forest on white is about
// 11.6:1), and a mint focus ring, which shows on the forest where the
// page's emerald one hardly does. Off, it recedes to a quiet glass on the
// green; the line under the amount says why.
const ON_FOREST =
  "bg-white text-emerald hover:bg-mint-50 dark:text-forest dark:hover:bg-mint-200 focus-visible:outline-mint-200 disabled:bg-white/14 disabled:text-white/70 disabled:shadow-none";

// What is ready to withdraw, in the deep green, with what is pending, what
// was ever earned and what has been paid out (ReferralDashboard); phones
// get the shorter card with the three on one line and a full-width
// Withdraw (ReferralMobile). Withdraw opens the withdraw page; below the
// smallest withdrawal it rests, and the line under the amount says so.
export function EarningsHero({ info, friends, currency, today }: EarningsHeroProps) {
  const { t, locale } = useLocale();
  const reasonId = useId();
  const program = programOf(info);
  const balances = balancesOf(info);
  const money = (value: number) => formatCurrency(value, currency, locale);
  const canWithdraw = balances.available >= program.minWithdrawal && balances.available > 0;
  const pendingFriends = friends.filter((friend) => friend.status === "PENDING").length;
  const since = earningSince(friends);
  const lastPaid = dayOf(balances.lastPaidAt);
  const pendingNext = dayOf(balances.pendingNextAt);

  const methodsLine = t(program.fee > 0 ? "To bKash, Nagad, Rocket or your bank · from {min} · {fee} fee" : "To bKash, Nagad, Rocket or your bank · from {min} · no fee", {
    min: money(program.minWithdrawal),
    fee: money(program.fee),
  });
  const line = canWithdraw ? methodsLine : balances.available > 0 ? t("You can withdraw once you have {min}", { min: money(program.minWithdrawal) }) : t("Nothing to withdraw right now");

  const stats = [
    {
      label: t("Pending"),
      value: money(balances.pending),
      sub:
        balances.pending <= 0
          ? t("Nothing waiting")
          : pendingNext
            ? t(pendingFriends === 1 ? "{count} friend · ready on {date}" : "{count} friends · ready on {date}", { count: formatCount(pendingFriends, locale), date: friendDay(pendingNext, today, locale) })
            : t(pendingFriends === 1 ? "{count} friend" : "{count} friends", { count: formatCount(pendingFriends, locale) }),
    },
    { label: t("Total earned"), value: money(balances.totalEarned), sub: since ? t("Since {month}", { month: formatDate(`${since}T06:00:00Z`, since.slice(0, 4) === today.slice(0, 4) ? "MMMM" : "MMMM yyyy", "", locale) }) : t("Nothing yet") },
    { label: t("Paid out@@referral"), value: money(balances.paidOut), sub: lastPaid ? t("Last paid on {date}", { date: friendDay(lastPaid, today, locale) }) : t("Nothing paid out yet") },
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
    <section aria-labelledby="rf-earn" className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-wallet-forest p-4.5 text-white md:gap-4.5 md:px-6 md:py-5.5">
      <span aria-hidden="true" className="absolute -top-15 -right-12.5 size-42.5 rounded-full border border-white/14 md:-top-20 md:-right-15 md:size-55" />
      <span aria-hidden="true" className="absolute -top-7.5 right-7.5 hidden size-35 rounded-full border border-white/10 md:block" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3 md:gap-1">
          <h2 id="rf-earn" className="text-[13px] leading-normal font-medium text-white/86 md:text-body">
            {t("Available to withdraw")}
          </h2>
          <span className="text-[32px] leading-normal font-bold tracking-[-0.02em] tabular-nums md:text-[38px]">{money(balances.available)}</span>
          <span id={reasonId} className="hidden text-[13px] leading-normal text-white/84 md:block">
            {line}
          </span>
        </div>
        <span className="hidden md:flex">{withdraw(false)}</span>
      </div>

      {/* Phones: the three on one line, then Withdraw across the card. */}
      <div className="relative flex flex-wrap gap-x-4.5 gap-y-1 text-[12.5px] leading-normal text-white/86 tabular-nums md:hidden">
        <span>
          {t("Pending")} <b className="font-bold text-white">{money(balances.pending)}</b>
        </span>
        <span>
          {t("Earned")} <b className="font-bold text-white">{money(balances.totalEarned)}</b>
        </span>
        <span>
          {t("Paid@@short")} <b className="font-bold text-white">{money(balances.paidOut)}</b>
        </span>
      </div>
      {!canWithdraw && <p className="relative text-[12.5px] leading-normal text-white/84 md:hidden">{line}</p>}
      <div className="relative md:hidden">{withdraw(true)}</div>

      <div className="relative hidden grid-cols-3 gap-3 border-t border-white/18 pt-4 md:grid">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col gap-0.75">
            <span className="text-[12.5px] leading-normal text-white/80">{stat.label}</span>
            <span className="text-[20px] leading-normal font-bold tabular-nums">{stat.value}</span>
            <span className="text-caption leading-normal text-white/75">{stat.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
