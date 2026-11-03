"use client";

import { Clock, Crown, Gift, Layers, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { daysLeft, gatewayLabel, planState, usagePercent, usageTone, type BillingOverview } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { checkoutHref } from "./checkoutRoute";

interface PlanStatusStripProps {
  overview: BillingOverview;
  // The free trial's length, when one can still be started.
  trialDays: number | null;
  readOnly: boolean;
  busy: boolean;
  onStartTrial: () => void;
  onCancel: () => void;
  onResume: () => void;
}

type Tone = "plain" | "mint" | "paid" | "amber";

const TONES: Record<Tone, { box: string; tile: string }> = {
  plain: { box: "border-line-card bg-surface", tile: "bg-surface-sunken text-ink-soft" },
  mint: { box: "border-mint-200 bg-emerald-soft", tile: "bg-mint-50 text-brand-ink" },
  paid: { box: "border-mint-200 bg-emerald-soft", tile: "bg-forest text-mint-200" },
  amber: { box: "border-warning-line bg-warning-soft/50", tile: "bg-warning-soft text-warning" },
};

// Where the customer stands now (UpgradePlan board's strip): a payment being
// checked, a trial and its days, the paid plan and its end, or the free
// plan's month so far, each with the one thing to do next.
export function PlanStatusStrip({ overview, trialDays, readOnly, busy, onStartTrial, onCancel, onResume }: PlanStatusStripProps) {
  const { t, fmt } = useLocale();
  const { subscription, usage, pendingPayment } = overview;
  const state = planState(subscription);
  const day = (iso: string) => formatDate(iso, "d MMM yyyy", "", fmt);
  const money = (amount: string | number) => formatCurrency(amount, "BDT", fmt);

  let tone: Tone = "plain";
  let Icon: LucideIcon = Layers;
  let title: string;
  let sub: string;
  let bar: { width: number; fill: string; label: string; labelTone: string } | null = null;
  let action: React.ReactNode = null;
  const pillButton = "flex h-10.5 shrink-0 items-center rounded-full px-4.5 text-body font-semibold whitespace-nowrap transition-colors disabled:opacity-60";

  if (pendingPayment) {
    tone = "amber";
    Icon = Clock;
    title = t("Payment being checked");
    sub = pendingPayment.submittedAt
      ? t("{amount} for {plan} by {wallet} · TrxID {trx}. Usually done within 2 hours.", { amount: money(pendingPayment.amount), plan: pendingPayment.planName, wallet: gatewayLabel(pendingPayment.gateway), trx: pendingPayment.reference ?? "" })
      : t("{amount} for {plan}. Send the money and type the TrxID to finish.", { amount: money(pendingPayment.amount), plan: pendingPayment.planName });
    action = (
      <Link href={checkoutHref({ payment: pendingPayment.id })} className={cn(pillButton, "bg-warning text-white hover:bg-warning-ink")}>
        {t("See status")}
      </Link>
    );
  } else if (state === "trial" && subscription.trialEndsAt) {
    tone = "mint";
    Icon = Gift;
    const total = Math.max(1, trialDays ?? 14);
    const left = Math.min(total, daysLeft(subscription.trialEndsAt));
    title = t("Free trial · {count} days left", { count: formatCount(left, fmt) });
    sub = t("Everything in Pro is on until {date}. Pick a plan before then to keep it.", { date: day(subscription.trialEndsAt) });
    bar = {
      width: Math.max(4, Math.round(((total - left) / total) * 100)),
      fill: "bg-emerald",
      label: t("Day {day} of {total}@@trial", { day: formatCount(Math.min(total, total - left + 1), fmt), total: formatCount(total, fmt) }),
      labelTone: "text-brand-ink",
    };
  } else if (state === "active" || state === "cancelling" || state === "pastDue") {
    tone = "paid";
    Icon = Crown;
    title = t("You're on {plan}", { plan: subscription.planName });
    const end = subscription.currentPeriodEnd ? day(subscription.currentPeriodEnd) : null;
    if (state === "pastDue") {
      sub = t("Your plan ended. Pay now to keep Pro, or it goes back to Free.");
      action = (
        <Link href={checkoutHref({ plan: subscription.planId })} aria-disabled={readOnly || undefined} className={cn(pillButton, "bg-forest text-white hover:bg-forest-hover", readOnly && "pointer-events-none opacity-60")}>
          {t("Pay now")}
        </Link>
      );
    } else if (state === "cancelling") {
      sub = end ? t("It ends on {date}, then you're on Free. Your data stays.", { date: end }) : t("It ends at the end of this period, then you're on Free.");
      action = (
        <button type="button" onClick={onResume} disabled={readOnly || busy} className={cn(pillButton, "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
          {t("Keep my plan")}
        </button>
      );
    } else {
      sub = end ? t("Active until {date}. We remind you 3 days before, nothing renews by itself.", { date: end }) : t("Active with no end date.");
      if (end) {
        action = (
          <button type="button" onClick={onCancel} disabled={readOnly || busy} className={cn(pillButton, "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
            {t("Cancel plan")}
          </button>
        );
      }
    }
  } else {
    title = t("You're on Free");
    const limit = usage.transactionLimit;
    if (limit >= 0) {
      sub = t("{used} of {limit} transactions used this month.", { used: formatCount(usage.transactionsThisMonth, fmt), limit: formatCount(limit, fmt) });
      const usageNow = usageTone(usage.transactionsThisMonth, limit);
      bar = {
        width: Math.max(usagePercent(usage.transactionsThisMonth, limit), usage.transactionsThisMonth > 0 ? 2 : 0),
        fill: usageNow === "over" ? "bg-expense-fill" : usageNow === "near" ? "bg-warning-fill" : "bg-emerald",
        label: usageNow === "over" ? t("Limit reached") : t("{count} left", { count: formatCount(usage.transactionsLeft ?? 0, fmt) }),
        labelTone: usageNow === "over" ? "text-expense" : usageNow === "near" ? "text-warning" : "text-brand-ink",
      };
    } else {
      sub = t("No monthly limit on your plan.");
    }
    if (trialDays) {
      action = (
        <button type="button" onClick={onStartTrial} disabled={readOnly || busy} className={cn(pillButton, "bg-forest text-white hover:bg-forest-hover")}>
          {t("Try Pro free for {days} days", { days: formatCount(trialDays, fmt) })}
        </button>
      );
    }
  }

  const look = TONES[tone];
  return (
    <section aria-label={t("Your plan now")} className={cn("flex flex-col gap-4 rounded-[18px] border px-5 py-4 md:flex-row md:items-center md:gap-4.5", look.box)}>
      <div className="flex min-w-0 flex-1 items-center gap-4.5">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-5.5", look.tile)}>
          <Icon strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <b className="text-[15.5px] font-semibold text-ink">{title}</b>
            <span className="text-[13.5px] text-ink-soft">{sub}</span>
          </div>
          {bar && (
            <div className="flex items-center gap-3">
              <div className="h-2 max-w-130 flex-1 overflow-hidden rounded-full bg-ink/8" role="progressbar" aria-valuenow={bar.width} aria-valuemin={0} aria-valuemax={100} aria-label={bar.label}>
                <div className={cn("h-full rounded-full", bar.fill)} style={{ width: `${bar.width}%` }} />
              </div>
              <span className={cn("text-[12.5px] font-semibold whitespace-nowrap", bar.labelTone)}>{bar.label}</span>
            </div>
          )}
        </div>
      </div>
      {action}
    </section>
  );
}
