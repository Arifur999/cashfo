"use client";

import { ArrowDownToLine } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { useWorkspaceSwitch } from "@/components/modules/Customer/Workspace/useWorkspaceSwitch";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { ReferralInfo } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { friendDay, nextReadyOn, paidOut, pendingFriends } from "@/lib/customer/referralDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface EarningsHeroProps {
  info: ReferralInfo;
  currency: string;
  // The reader may post into a wallet of this workspace (owner or accountant).
  canWithdraw: boolean;
  // The app's "YYYY-MM-DD", for the next reward's day.
  today: string;
  onWithdraw: () => void;
}

// The hero's ground is the forest gradient in both themes, so the button
// takes colours that don't change in dark either (forest on white is about
// 11.6:1, on mint-200 about 10:1; the dark hover is pinned too, or the main
// button's emerald one would win), and a mint focus ring, which shows on
// the forest where the page's emerald one hardly does. Off, it recedes to a
// quiet glass on the green (half-faded white read as a muddy sage block);
// the line under the amount says why.
const ON_FOREST = "bg-white text-forest hover:bg-mint-200 dark:hover:bg-mint-200 focus-visible:outline-mint-200 disabled:bg-white/14 disabled:text-white/70 disabled:opacity-100 disabled:shadow-none";

// The switch under the amount reads as a link in the sentence.
const SWITCH_LINK = "font-semibold text-white underline underline-offset-2 hover:text-mint-200 focus-visible:outline-mint-200";

// What is ready to withdraw, in the deep green, with what is pending, what
// was ever earned and what has been paid out. Phones get the board's
// shorter card: the three on one line and a full-width Withdraw, with the
// board's natural line heights (a taka sign stands its line taller). When
// Withdraw can't be pressed, the line under the amount says why.
export function EarningsHero({ info, currency, canWithdraw, today, onWithdraw }: EarningsHeroProps) {
  const { t, locale } = useLocale();
  const reasonId = useId();
  // Staff of a business workspace switch to their own one right here, like
  // the Books notice: the page comes back in place with Withdraw on.
  const switcher = useWorkspaceSwitch({ land: "stay" });
  const personal = switcher.workspaces.find((business) => business.type === "PERSONAL" && business.id !== switcher.activeBusinessId);
  const pending = pendingFriends(info);
  const next = nextReadyOn(info);
  const hasMoney = Number(info.availableBalance) > 0;
  const canPress = canWithdraw && hasMoney;
  const count = (value: number) => formatCount(value, locale);

  const stats = [
    {
      label: t("Pending"),
      value: formatCurrency(info.pendingEarnings, currency, locale),
      sub:
        pending === null
          ? t("Ready 30 days after each friend joins")
          : pending === 0
            ? t("Nothing waiting")
            : t(pending === 1 ? "{count} friend · ready 30 days after joining" : "{count} friends · ready 30 days after joining", { count: count(pending) }),
    },
    { label: t("Total earned"), value: formatCurrency(info.totalEarned, currency, locale), sub: t(info.referralCount === 1 ? "{count} friend joined" : "{count} friends joined", { count: count(info.referralCount) }) },
    { label: t("Paid out@@referral"), value: formatCurrency(paidOut(info), currency, locale), sub: t("Withdrawn to your wallets") },
  ];

  // Why Withdraw can't be pressed: not the reader's to move in this
  // workspace (their own personal one always is), or nothing to move yet.
  // With no personal workspace to switch to, the link opens Settings ›
  // Workspaces instead.
  const notYours = (
    <>
      {t("Only an owner or accountant of this workspace can withdraw.")}{" "}
      {personal ? (
        <button type="button" onClick={() => switcher.choose(personal)} disabled={switcher.busy} className={cn("inline-flex cursor-pointer items-center gap-1.5 text-left disabled:cursor-wait", SWITCH_LINK)}>
          {switcher.pendingId === personal.id && <Loader size={14} onDark label="Loading..." />}
          {t("Switch to your own workspace")}
        </button>
      ) : (
        <Link href="/settings/workspaces" className={SWITCH_LINK}>
          {t("Switch to your own workspace")}
        </Link>
      )}
    </>
  );
  const nothingYet = next ? t("Your next reward is ready on {date}", { date: friendDay(next, today, locale) }) : t("Nothing to withdraw right now");
  const reason = !canWithdraw ? notYours : hasMoney ? null : nothingYet;
  const describedBy = reason ? reasonId : undefined;

  return (
    <section aria-labelledby="earn-title" className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-wallet-forest p-5 text-white md:gap-4 md:p-6">
      <span aria-hidden="true" className="absolute -top-15 -right-12.5 size-42.5 rounded-full border border-white/14 md:-top-20 md:-right-15 md:size-55" />
      <span aria-hidden="true" className="absolute -top-7.5 right-7.5 hidden size-35 rounded-full border border-white/10 md:block" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3 md:gap-1">
          <h2 id="earn-title" className="text-small font-medium text-white/86 max-md:leading-[normal] md:text-body">
            {t("Available to withdraw")}
          </h2>
          <span className="text-display text-white tabular-nums max-md:leading-[normal] max-md:font-bold">{formatCurrency(info.availableBalance, currency, locale)}</span>
          {reason ? (
            <p id={reasonId} className="max-w-md text-small text-white">
              {reason}
            </p>
          ) : (
            <span className="text-small text-white/84 max-md:hidden">{t("To any wallet or savings wallet · no fee")}</span>
          )}
        </div>
        <Button size="lg" onClick={onWithdraw} disabled={!canPress} aria-describedby={describedBy} className={cn(ON_FOREST, "enabled:shadow-[0_6px_16px_rgba(14,26,22,0.18)] max-md:hidden")}>
          <ArrowDownToLine />
          {t("Withdraw@@referral")}
        </Button>
      </div>
      {/* Each label stays with its figure and the pairs wrap as wholes:
          Bangla's three need more than a 390px phone has on one line. */}
      <div className="relative flex flex-wrap gap-x-4 gap-y-1 text-small leading-[normal] text-white/86 tabular-nums md:hidden">
        <span className="whitespace-nowrap">
          {t("Pending")} <b className="text-white">{formatCurrency(info.pendingEarnings, currency, locale)}</b>
        </span>
        <span className="whitespace-nowrap">
          {t("Earned")} <b className="text-white">{formatCurrency(info.totalEarned, currency, locale)}</b>
        </span>
        <span className="whitespace-nowrap">
          {t("Paid@@payout")} <b className="text-white">{formatCurrency(paidOut(info), currency, locale)}</b>
        </span>
      </div>
      <Button size="xl" onClick={onWithdraw} disabled={!canPress} aria-describedby={describedBy} className={cn(ON_FOREST, "relative w-full rounded-lg text-body-lg font-bold md:hidden")}>
        <ArrowDownToLine />
        {t("Withdraw@@referral")}
      </Button>
      <div className="relative hidden grid-cols-3 gap-3 border-t border-white/18 pt-4 md:grid">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col gap-0.75">
            <span className="text-small text-white/80">{stat.label}</span>
            <span className="text-h2 font-bold text-white tabular-nums">{stat.value}</span>
            <span className="text-caption text-white/75">{stat.sub}</span>
          </div>
        ))}
      </div>
      {/* A PIN-locked personal workspace asks for its PIN first. */}
      {switcher.pinPrompt}
    </section>
  );
}
