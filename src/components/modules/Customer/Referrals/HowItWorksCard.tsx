"use client";

import { ArrowDownToLine, Check, ChevronDown, DollarSign, Share, ShoppingCart } from "lucide-react";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import type { programOf } from "@/lib/customer/referralDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Program = ReturnType<typeof programOf>;

// The program's steps and rules in the reader's words, its own numbers
// filled in (what the admin set: the commission, the discount, the hold,
// the smallest withdrawal, the fee and the working days).
export function useProgramWords(program: Program, currency: string) {
  const { t, fmt } = useLocale();
  const pct = (value: number) => `${formatCount(value, fmt)}%`;
  const days = formatCount(program.holdDays, fmt);
  const min = formatCurrency(program.minWithdrawal, currency, fmt);
  return {
    pct,
    steps: [
      { icon: Share, title: t("Share your link"), body: t("On WhatsApp, Messenger or email. Friends sign up with it.") },
      { icon: ShoppingCart, title: t("They buy a plan"), body: t("Their first payment is {pct} cheaper because of your link.", { pct: pct(program.friendDiscountPct) }) },
      { icon: DollarSign, title: t("You earn {pct}", { pct: pct(program.commissionPct) }), body: t("It is ready {days} days later. Withdraw it to bKash, Nagad, Rocket or a bank.", { days }) },
    ],
    rules: [
      program.whoCanEarn === "EVERYONE" ? t("You earn on any plan, the Free plan too.") : t("You earn while your own plan is active."),
      t("Money becomes available {days} days after your friend pays. If they get a refund, it is cancelled.", { days }),
      program.fee > 0
        ? t("Withdraw from {min}. A {fee} fee. Paid within {days} working days.", { min, fee: formatCurrency(program.fee, currency, fmt), days: formatCount(program.payWithinDays, fmt) })
        : t("Withdraw from {min}. No fee. Paid within {days} working days.", { min, days: formatCount(program.payWithinDays, fmt) }),
      t("Signing up again with your own link does not count."),
      t("Invite as many friends as you like."),
    ],
    // The Free-plan page's four steps.
    lockedSteps: [
      { icon: ShoppingCart, title: t("Buy any paid plan"), body: t("Your invite link appears here straight away.") },
      { icon: Share, title: t("Share the link"), body: t("Friends get {pct} off their first plan.", { pct: pct(program.friendDiscountPct) }) },
      { icon: DollarSign, title: t("Earn {pct}", { pct: pct(program.commissionPct) }), body: t("Of what each friend pays, ready {days} days later.", { days }) },
      { icon: ArrowDownToLine, title: t("Withdraw@@referral"), body: t("To bKash, Nagad, Rocket or a bank, from {min}.", { min }) },
    ],
  };
}

// The steps' tile: the primary's faint tint with its icon.
export function StepTile({ icon: Icon, size = 30 }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; size?: 30 | 32 }) {
  return (
    <span aria-hidden="true" className={size === 32 ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-soft text-emerald" : "flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-soft text-emerald"}>
      <Icon className={size === 32 ? "size-4" : "size-3.75"} strokeWidth={2} />
    </span>
  );
}

// "How it works" and "The rules": two cards beside the friends list from
// xl (ReferralDashboard), side by side under it on tablets, and one closed
// "How it works" row on phones, where the board leaves them out, so they
// are there without pushing the list down.
export function HowItWorksCard({ program, currency }: { program: Program; currency: string }) {
  const { t } = useLocale();
  const { steps, rules } = useProgramWords(program, currency);

  const stepList = (
    <ol className="flex flex-col gap-3.5">
      {steps.map((step) => (
        <li key={step.title} className="flex gap-3">
          <StepTile icon={step.icon} />
          <span className="flex flex-col gap-0.5">
            <span className="text-body leading-normal font-semibold text-ink">{step.title}</span>
            <span className="text-[13px] leading-normal text-ink-muted">{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );

  const ruleList = (
    <ul className="flex flex-col gap-2.25">
      {rules.map((rule) => (
        <li key={rule} className="flex gap-2 text-[13px] leading-normal text-ink-2">
          <Check className="mt-0.75 size-3.5 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
          <span>{rule}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className="group rounded-card border border-line-card bg-surface shadow-card md:hidden">
        <summary className="flex min-h-control-lg cursor-pointer list-none items-center justify-between gap-3 px-4 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
          {t("How it works")}
          <ChevronDown className="size-4.5 text-ink-faint transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-divider px-4 py-4">
          {stepList}
          <h3 className="text-body font-semibold text-ink">{t("The rules")}</h3>
          {ruleList}
        </div>
      </details>
      <div className="hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-1">
        <Card padding="none" className="flex flex-col gap-3.5 px-5 py-4.5">
          <h2 className="text-title text-ink">{t("How it works")}</h2>
          {stepList}
        </Card>
        <Card padding="none" className="flex flex-col gap-2.5 px-5 py-4.5">
          <h2 className="text-title text-ink">{t("The rules")}</h2>
          {ruleList}
        </Card>
      </div>
    </>
  );
}
