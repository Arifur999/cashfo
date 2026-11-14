"use client";

import { ArrowRight, Bell, CalendarDays, Check, ChevronRight, Clock, Download, FileDown, LineChart, Mail, Plus, ReceiptText, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { familyName, type BillingPlans, type CustomerPayment, type FeatureLimits } from "@/lib/customer/billingDisplay";
import { formatWalletNumber, takaInWords } from "@/lib/customer/checkoutDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { MONEY_HOME } from "@/lib/customer/nav";
import { formatDate, toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { sentByLabel } from "./PendingView";
import { invoicePdfHref, ReceiptDialog, ReceiptMini, type ReceiptModel } from "./Receipt";

const DAY_MS = 86_400_000;

// What the plan opens up, as the board's "Now you can" tiles: only those
// the plan really has.
const UNLOCKED: { feature: keyof FeatureLimits; href: string; icon: LucideIcon; tone: string; title: string; sub: string }[] = [
  { feature: "maxTransactionsPerMonth", href: "/transactions", icon: Plus, tone: "bg-mint-50 text-brand-ink", title: "Add any number of transactions", sub: "No monthly limit any more" },
  { feature: "advancedReports", href: "/reports/detailed", icon: LineChart, tone: "bg-info-soft text-info-ink", title: "See advanced reports", sub: "Yearly view and category trends" },
  { feature: "pdfExport", href: "/reports/detailed", icon: FileDown, tone: "bg-rose-soft text-rose", title: "Export reports as PDF", sub: "Share or print any month" },
  { feature: "incomeGoalTracking", href: "/categories", icon: Target, tone: "bg-warning-soft text-warning", title: "Set an income goal", sub: "Track what you want to earn" },
];

const hasFeature = (limits: FeatureLimits, key: keyof FeatureLimits): boolean => {
  const value = limits[key];
  return key === "maxTransactionsPerMonth" ? value === -1 : value === true;
};

// Checkout › You're all set (Checkout board, done): the plan that's on and
// what was paid, what it opens up, what happens next, and the receipt.
export function DoneView({ payment, plans }: { payment: CustomerPayment; plans: BillingPlans }) {
  const { t, fmt, locale } = useLocale();
  const { user } = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const money = (amount: string | number) => formatCurrency(amount, "BDT", fmt);
  const day = (iso: string) => formatDate(iso, "d MMM yyyy", "", fmt);
  const family = t(familyName(payment.planName));
  const limits = plans.plans.find((plan) => plan.id === payment.planId)?.featureLimits ?? {};
  const method = sentByLabel(payment.gateway, t);
  const paidAt = payment.paidAt ?? payment.createdAt;
  const periodEnd = payment.periodEnd;
  const emailed = payment.invoice?.emailedAt ? user.email : null;
  const listPrice = payment.listPrice ?? payment.amount;
  const discount = payment.discount && Number(payment.discount) > 0 ? payment.discount : null;

  const features = [
    limits.maxTransactionsPerMonth === -1 && t("no monthly limit on transactions"),
    limits.advancedReports && t("advanced reports"),
    limits.pdfExport && t("PDF export"),
    limits.incomeGoalTracking && t("income goals"),
  ].filter((part): part is string => Boolean(part));

  const receipt: ReceiptModel | null = payment.invoice && {
    invoiceId: payment.invoice.id,
    invoiceNumber: payment.invoice.invoiceNumber,
    billedTo: { name: user.name, email: user.email, phone: user.phone ? formatWalletNumber(user.phone) : null },
    paidOn: { date: day(paidAt), time: t("{time}, Dhaka time", { time: formatDate(paidAt, "h:mm aaa", "", fmt) }) },
    method,
    reference: payment.reference ?? null,
    item: t("{plan} plan", { plan: t(payment.planName) }),
    itemSub: features.length > 0 ? features.join(", ").replace(/^./, (first) => first.toUpperCase()) : t(payment.planName),
    period: payment.periodStart && periodEnd ? t("{start} to {end}", { start: day(payment.periodStart), end: day(periodEnd) }) : "—",
    subtotal: money(listPrice),
    discount: discount === null ? null : {
      label: payment.couponCode ? t("Promo {code}", { code: payment.couponCode }) : payment.referralDiscount ? t("Referral discount") : t("Discount"),
      amount: money(discount),
    },
    total: money(payment.amount),
    words: takaInWords(Number(payment.amount), locale === "bn" ? "bn" : "en"),
  };

  const chips: { icon: LucideIcon; text: string }[] = [
    ...(periodEnd ? [{ icon: CalendarDays, text: t("Active until {date}", { date: day(periodEnd) }) }] : []),
    ...(payment.invoice ? [{ icon: ReceiptText, text: payment.invoice.invoiceNumber }] : []),
    ...(emailed ? [{ icon: Mail, text: t("Sent to {email}", { email: emailed }) }] : []),
  ];
  const paidToday = toDateInputValue(paidAt) === toDateInputValue(new Date());
  const next = [
    { title: t("{plan} is on", { plan: family }), sub: method, date: paidToday ? t("Today") : day(paidAt), dot: "bg-emerald", icon: Check },
    ...(periodEnd
      ? [
          { title: t("We remind you"), sub: t("3 days before your plan ends, by notification and email"), date: day(new Date(new Date(periodEnd).getTime() - 3 * DAY_MS).toISOString()), dot: "bg-warning-fill", icon: Bell },
          { title: t("Plan ends"), sub: t("Renew if you want to keep {plan}. Nothing is taken automatically.", { plan: family }), date: day(periodEnd), dot: "bg-ink-faint", icon: Clock },
        ]
      : []),
  ];
  const tiles = UNLOCKED.filter((tile) => hasFeature(limits, tile.feature));
  const card = "flex flex-col rounded-card border border-line-card bg-surface px-5 shadow-card";

  return (
    <div className="flex flex-col gap-4.5">
      <section aria-labelledby="done-title" className="relative flex flex-col gap-6 overflow-hidden rounded-panel bg-linear-135 from-forest to-emerald px-6 py-6.5 text-white shadow-[0_14px_34px_rgba(15,63,56,0.22)] md:flex-row md:items-center md:px-7.5">
        <svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true" className="absolute -top-22.5 -right-15 text-mint-200/12">
          <circle cx="130" cy="130" r="96" fill="none" stroke="currentColor" strokeWidth="34" />
        </svg>
        <span className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-mint-200 text-forest ring-8 ring-mint-200/16">
          <Check className="size-8" strokeWidth={2.8} aria-hidden="true" />
        </span>
        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex h-6 items-center self-start rounded-full bg-mint-200/18 px-2.5 text-[12.5px] font-semibold text-mint-200">{t("Payment received")}</span>
          <h2 id="done-title" className="text-[26px] leading-[1.2] font-semibold tracking-[-0.02em]">
            {t("You're on {plan}", { plan: t(payment.planName) })}
          </h2>
          <p className="text-[14.5px] text-mint-50">{emailed ? t("Everything in {plan} is on now. Your receipt is ready below and in your email.", { plan: family }) : t("Everything in {plan} is on now. Your receipt is ready below.", { plan: family })}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {chips.map(({ icon: Icon, text }) => (
              <span key={text} className="flex h-7.5 items-center gap-1.75 rounded-full border border-mint-200/24 bg-white/10 px-3 text-[13px] font-medium whitespace-nowrap">
                <Icon className="size-3.5 text-mint-200" strokeWidth={2} aria-hidden="true" />
                {text}
              </span>
            ))}
          </div>
        </div>
        <div className="relative flex shrink-0 flex-col gap-1 border-mint-200/24 md:items-end md:border-l md:pl-6">
          <span className="text-[13px] text-mint-200">{t("You paid")}</span>
          <b className="text-[38px] font-semibold tracking-[-0.03em] tabular-nums">{money(payment.amount)}</b>
          <span className="text-[13px] text-mint-50">{method}</span>
        </div>
      </section>

      <div className="grid items-start gap-4.5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="flex min-w-0 flex-col gap-4">
          {tiles.length > 0 && (
            <section aria-labelledby="done-now" className={cn(card, "gap-3 py-4.5")}>
              <h3 id="done-now" className="text-[16px] font-semibold text-ink">
                {t("Now you can")}
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {tiles.map(({ href, icon: Icon, tone, title, sub }) => (
                  <Link key={title} href={href} className="flex items-center gap-3 rounded-[14px] border border-divider bg-strip px-3.5 py-3 text-ink hover:border-line">
                    <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[11px]", tone)}>
                      <Icon className="size-4.75" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <b className="text-[14px] font-semibold">{t(title)}</b>
                      <span className="text-[12.5px] text-ink-muted">{t(sub)}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-faint" strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="done-next" className={cn(card, "gap-1 pt-4.5 pb-3")}>
            <h3 id="done-next" className="mb-2 text-[16px] font-semibold text-ink">
              {t("What happens next")}
            </h3>
            <ol>
              {next.map(({ title, sub, date, dot, icon: Icon }, index) => (
                <li key={title} className="flex items-stretch gap-3">
                  <span className="flex w-5.5 shrink-0 flex-col items-center">
                    <span aria-hidden="true" className={cn("flex size-5.5 items-center justify-center rounded-full text-white", dot)}>
                      <Icon className="size-3" strokeWidth={3} />
                    </span>
                    {index < next.length - 1 && <span aria-hidden="true" className="my-0.75 w-0.5 flex-1 bg-line" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px pb-3.5">
                    <b className="text-[14px] font-semibold text-ink">{title}</b>
                    <span className="text-[12.5px] text-ink-muted">{sub}</span>
                  </span>
                  <span className="pt-0.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-2">{date}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-labelledby="done-receipt" className={cn(card, "gap-3.5 px-4.5 py-4.5")}>
          <div className="flex items-center justify-between">
            <h3 id="done-receipt" className="text-[16px] font-semibold text-ink">
              {t("Your receipt")}
            </h3>
            <span className="text-[12.5px] text-ink-muted">PDF · A4</span>
          </div>
          {receipt ? (
            <>
              <ReceiptMini receipt={receipt} onOpen={() => setReceiptOpen(true)} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setReceiptOpen(true)} className="h-11 rounded-full border border-input bg-surface text-[14px] font-semibold text-ink hover:bg-surface-sunken">
                  {t("View full receipt")}
                </button>
                <a href={invoicePdfHref(receipt.invoiceId)} download className="flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-[14px] font-semibold text-white hover:bg-forest-hover">
                  <Download className="size-4" strokeWidth={2.2} aria-hidden="true" />
                  {t("Download PDF")}
                </a>
              </div>
              <ReceiptDialog receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
            </>
          ) : (
            <p className="rounded-[14px] bg-strip px-4 py-5 text-[13.5px] text-ink-muted">{t("Your receipt is being made. It shows here and in Settings › Plans soon.")}</p>
          )}
          <Link href={MONEY_HOME} className="flex h-11 items-center justify-center gap-2 rounded-full bg-mint-50 text-[14px] font-semibold text-forest hover:bg-mint-200/70 dark:text-ink">
            {t("Go to dashboard")}
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
