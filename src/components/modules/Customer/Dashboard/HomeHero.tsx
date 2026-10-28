"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Camera, PiggyBank, ShieldCheck, Star, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { usePlanChip } from "@/components/modules/Customer/Providers/PlanProvider";
import { workspaceKind } from "@/components/modules/Customer/Layout/workspaceKind";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { workspaceName } from "@/lib/customer/workspaceSwitch";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DashboardPeriodKey } from "./dashboardFigures";
import type { HomeData } from "./homeTypes";

// The cards' shared frame (the design's 18px card).
export const CARD = "rounded-card border border-line-card bg-surface shadow-card";
// The hero's deep-teal shadow (the design's 0 8px 24px at 22%).
const HERO_SHADOW = "shadow-[0_8px_24px_color-mix(in_srgb,var(--forest)_22%,transparent)]";
const FIGURE = "text-[32px] leading-[normal] font-bold tracking-[-0.03em] tabular-nums";
const LABEL = "text-[13px] leading-[normal] font-medium";

// What a period's figures are compared with, in the words of each period.
const COMPARE: Record<DashboardPeriodKey, { vs: string; less: string; more: string }> = {
  "this-month": { vs: "vs last month", less: "less than last month", more: "more than last month" },
  "last-month": { vs: "vs the month before", less: "less than the month before", more: "more than the month before" },
  "this-year": { vs: "vs last year", less: "less than last year", more: "more than last year" },
  custom: { vs: "vs the period before", less: "less than the period before", more: "more than the period before" },
};

const SAVED_LABEL: Record<DashboardPeriodKey, string> = {
  "this-month": "Saved this month",
  "last-month": "Saved last month",
  "this-year": "Saved this year",
  custom: "Saved in this period",
};

export type AddKind = "income" | "expense" | "transfer";

const percentText = (value: number, locale: FormatLocale) => `${toLocaleDigits(Math.abs(value).toFixed(1), locale)}%`;

// What share of the period's income was kept; null without income.
export const savedRate = (income: number, expense: number): number | null => (income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : null);

// The round tile in a figure card's corner.
function CornerIcon({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4.5", className)}>{children}</span>;
}

// A change against the earlier period: the pill with its arrow, and what it
// is compared with. Good news (more in, less out) is green, bad news red.
function ChangeLine({ change, good, text, onDark = false }: { change: number; good: boolean; text: string; onDark?: boolean }) {
  const { fmt } = useLocale();
  const Arrow = change >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className={cn("relative flex items-center gap-2 text-caption", onDark ? "text-mint-200" : "text-ink-muted")}>
      <span className={cn("inline-flex items-center gap-0.75 rounded-full px-2 py-0.5 font-semibold", onDark ? "bg-mint-200/18 text-white/90" : good ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}>
        <Arrow className="size-3" strokeWidth={2.5} aria-hidden="true" />
        {percentText(change, fmt)}
      </span>
      <span>{text}</span>
    </div>
  );
}

// The profile card at the head of the Dashboard: the photo (or the
// initials on mint), the plan and how long they've been here, the name and
// workspace, the quick add buttons and Upgrade.
export function ProfileCard({ data, onAdd }: { data: HomeData; onAdd: (kind: AddKind) => void }) {
  const { t, fmt } = useLocale();
  const { user, activeBusiness } = useAuth();
  const { profile } = data;
  const { free, label: planLabel } = usePlanChip();
  const workspace = activeBusiness && activeBusiness.type !== "PERSONAL" ? workspaceName(activeBusiness, user.name) : t(`${workspaceKind(activeBusiness)} workspace`);
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const round = "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-4.5";

  return (
    <section aria-labelledby="pc-name" className={cn(CARD, "hidden flex-col gap-3.5 rounded-panel p-3 md:row-span-2 md:flex")}>
      <div className="relative min-h-49 grow overflow-hidden rounded-lg bg-mint-200 dark:bg-emerald-tint">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- an uploaded photo on another host, at its own size
          <img src={profile.avatarUrl} alt={profile.name} className="absolute inset-0 size-full object-cover object-[center_6%]" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center pb-6 text-[64px] font-semibold tracking-[-0.03em] text-forest/45 dark:text-mint-200/45">
            {initials}
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-18 bg-linear-to-t from-forest/55 to-forest/0" />
        <Link
          href="/settings/profile"
          aria-label={t("Change profile photo")}
          title={t("Change profile photo")}
          className="absolute top-2.5 right-2.5 flex size-8.5 items-center justify-center rounded-full bg-white text-forest shadow-button hover:bg-mint-50"
        >
          <Camera className="size-4" strokeWidth={2} aria-hidden="true" />
        </Link>
        <span className="absolute bottom-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-night-ink px-3 text-caption font-semibold text-white">
          <ShieldCheck className="size-3.25 text-mint-200" strokeWidth={2.25} aria-hidden="true" />
          {planLabel}
        </span>
        {profile.since && (
          <span className="absolute right-3 bottom-3 inline-flex h-7 items-center rounded-full bg-white/72 px-2.5 text-caption font-semibold text-forest">{t("Since {date}", { date: profile.since })}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1.5">
        <h2 id="pc-name" className="truncate text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {profile.name}
        </h2>
        <span className="truncate text-[13px] leading-[normal] text-ink-muted">
          {workspace} · {t(data.wallets.length === 1 ? "{count} wallet" : "{count} wallets", { count: formatCount(data.wallets.length, fmt) })}
        </span>
      </div>
      <div className="flex items-center gap-2 px-1.5 pb-1.5">
        {data.canManage && (
          <>
            <button type="button" onClick={() => onAdd("income")} aria-label={t("Add income")} title={t("Add income")} className={cn(round, "bg-mint-50 text-emerald hover:bg-mint-200 dark:hover:bg-emerald-line")}>
              <ArrowDownLeft strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onAdd("expense")} aria-label={t("Add expense")} title={t("Add expense")} className={cn(round, "bg-expense-soft text-expense-fill hover:bg-expense-line")}>
              <ArrowUpRight strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onAdd("transfer")} aria-label={t("Move money between wallets")} title={t("Move money")} className={cn(round, "bg-surface-sunken text-ink-2 hover:bg-line")}>
              <ArrowLeftRight strokeWidth={2.25} aria-hidden="true" />
            </button>
          </>
        )}
        <span className="grow" />
        <Link href={PLANS_ROUTE} className="flex h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-[13.5px] font-semibold whitespace-nowrap text-white hover:bg-forest-hover">
          <Star className="size-3.75 fill-mint-200/35 text-mint-200" strokeWidth={2} aria-hidden="true" />
          {free ? t("Upgrade") : t("Manage plan")}
        </Link>
      </div>
    </section>
  );
}

// The deep-teal Total balance card: the active wallets now, and how much
// that grew since the 1st.
export function BalanceCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const change = data.balanceChangePercent;
  return (
    <div className={cn("relative flex flex-col gap-3 overflow-hidden rounded-card bg-forest p-5 text-white", HERO_SHADOW)}>
      <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden="true" className="absolute -right-16 -bottom-24">
        <circle cx="90" cy="90" r="70" fill="none" className="stroke-mint-200" strokeOpacity="0.14" strokeWidth="22" />
        <circle cx="90" cy="90" r="70" fill="none" className="stroke-mint-300" strokeOpacity="0.55" strokeWidth="22" strokeDasharray="120 320" strokeLinecap="round" transform="rotate(-90 90 90)" />
      </svg>
      <div className="relative flex items-center justify-between">
        <span className={cn(LABEL, "text-mint-200")}>{t("Total balance")}</span>
        <CornerIcon className="bg-mint-200/16 text-mint-200">
          <Wallet strokeWidth={2} aria-hidden="true" />
        </CornerIcon>
      </div>
      <span className={cn("relative", FIGURE)}>{formatCurrency(data.balance, data.currency, fmt)}</span>
      {change !== null ? <ChangeLine change={change} good={change >= 0} text={t("vs last month")} onDark /> : <span className="relative text-caption text-mint-200">{t(data.wallets.length === 1 ? "In {count} wallet" : "In {count} wallets", { count: formatCount(data.wallets.length, fmt) })}</span>}
    </div>
  );
}

// Money in or out over the period, with its change against the period
// before.
export function FlowCard({ data, kind }: { data: HomeData; kind: "income" | "expense" }) {
  const { t, fmt } = useLocale();
  const income = kind === "income";
  const value = income ? data.income : data.expense;
  const change = income ? data.incomeChange : data.expenseChange;
  const words = COMPARE[data.period.key];
  return (
    <div className={cn(CARD, "flex flex-col gap-3 p-5")}>
      <div className="flex items-center justify-between">
        <span className={cn(LABEL, "text-ink-muted")}>{t(income ? "Income" : "Expense")}</span>
        <CornerIcon className={income ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense-fill"}>{income ? <ArrowDownLeft strokeWidth={2.25} aria-hidden="true" /> : <ArrowUpRight strokeWidth={2.25} aria-hidden="true" />}</CornerIcon>
      </div>
      <span className={cn(FIGURE, value === 0 ? "text-ink-faint" : income ? "text-emerald" : "text-expense")}>{formatCurrency(value, data.currency, fmt)}</span>
      {change !== null ? (
        <ChangeLine change={change} good={income ? change >= 0 : change <= 0} text={t(income ? words.vs : change <= 0 ? words.less : words.more)} />
      ) : (
        <span className="text-caption text-ink-muted">{t(income ? "No income to compare with" : "No expenses to compare with")}</span>
      )}
    </div>
  );
}

// What was left of the period's income once its spending was out.
export function SavedCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const saved = data.income - data.expense;
  const rate = savedRate(data.income, data.expense);
  return (
    <div className="flex flex-col gap-3 rounded-card border border-mint-200 bg-mint-50 p-5 dark:border-emerald-line">
      <div className="flex items-center justify-between">
        <span className={cn(LABEL, "text-brand-ink")}>{t(SAVED_LABEL[data.period.key])}</span>
        <CornerIcon className="bg-surface text-emerald">
          <PiggyBank strokeWidth={2} aria-hidden="true" />
        </CornerIcon>
      </div>
      <span className={cn(FIGURE, saved < 0 ? "text-expense" : "text-ink")}>{saved < 0 ? formatSignedCurrency(saved, data.currency, fmt) : formatCurrency(saved, data.currency, fmt)}</span>
      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-emerald" style={{ width: `${rate ?? 0}%` }} />
        </div>
        <span className="text-caption text-brand-ink">
          {rate === null
            ? t("Shows up after your first income")
            : saved < 0
              ? t("More went out than came in")
              : fillNodes(t("{rate} of income saved (income − expense)"), { rate: <b className="font-semibold text-ink">{toLocaleDigits(String(rate), fmt)}%</b> })}
        </span>
      </div>
    </div>
  );
}

// The phone board's versions: a flatter balance card, income and expense
// side by side, and a one-line Saved card.
export function PhoneFigures({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const change = data.balanceChangePercent;
  const saved = data.income - data.expense;
  const rate = savedRate(data.income, data.expense);
  const vs = data.period.key === "this-month" ? t("vs {month}", { month: data.lastMonthShort }) : t(COMPARE[data.period.key].vs);
  const flow = (kind: "income" | "expense") => {
    const income = kind === "income";
    const value = income ? data.income : data.expense;
    const delta = income ? data.incomeChange : data.expenseChange;
    const good = delta !== null && (income ? delta >= 0 : delta <= 0);
    return (
      <div className={cn(CARD, "flex min-w-0 flex-col gap-2 p-3.5")}>
        <div className="flex items-center gap-2">
          <span className={cn("flex size-7 items-center justify-center rounded-sm [&_svg]:size-3.75", income ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense-fill")}>
            {income ? <ArrowDownLeft strokeWidth={2.25} aria-hidden="true" /> : <ArrowUpRight strokeWidth={2.25} aria-hidden="true" />}
          </span>
          <span className="text-[13px] leading-[normal] text-ink-muted">{t(income ? "Income" : "Expense")}</span>
        </div>
        <span className={cn("truncate text-[19px] leading-[normal] font-bold tabular-nums", income ? "text-emerald" : "text-expense")}>{formatCurrency(value, data.currency, fmt)}</span>
        {delta !== null && (
          <span className={cn("text-caption font-semibold", good ? "text-emerald" : "text-expense")}>
            {delta >= 0 ? "↑" : "↓"} {percentText(delta, fmt)} <span className="font-normal text-ink-muted">{vs}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section aria-label={t("Total balance")} className={cn("relative flex flex-col gap-2.5 overflow-hidden rounded-[20px] bg-forest p-5 text-white", HERO_SHADOW)}>
        <span aria-hidden="true" className="absolute -top-15 -right-12.5 size-45 rounded-full border border-white/14" />
        <span className="relative text-[13px] leading-[normal] text-mint-200">{t("Total balance")}</span>
        <span className="relative text-[30px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{formatCurrency(data.balance, data.currency, fmt)}</span>
        <div className="relative flex items-center justify-between gap-2">
          {change !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-2.5 py-0.75 text-caption font-semibold">
              {change >= 0 ? <TrendingUp className="size-3" strokeWidth={2.5} aria-hidden="true" /> : <TrendingDown className="size-3" strokeWidth={2.5} aria-hidden="true" />}
              {t("{change} vs last month", { change: percentText(change, fmt) })}
            </span>
          ) : (
            <span />
          )}
          <span className="text-caption text-white/84">{t(data.wallets.length === 1 ? "{count} wallet" : "{count} wallets", { count: formatCount(data.wallets.length, fmt) })}</span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        {flow("income")}
        {flow("expense")}
      </div>
      <div className="flex flex-col gap-2.5 rounded-card border border-mint-200 bg-mint-50 px-4 py-3.5 dark:border-emerald-line">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] leading-[normal] text-brand-ink">{t(SAVED_LABEL[data.period.key])}</span>
          <span className={cn("text-[19px] leading-[normal] font-bold tabular-nums", saved < 0 ? "text-expense" : "text-ink")}>{saved < 0 ? formatSignedCurrency(saved, data.currency, fmt) : formatCurrency(saved, data.currency, fmt)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-emerald" style={{ width: `${rate ?? 0}%` }} />
        </div>
        <span className="text-caption text-brand-ink">
          {rate === null
            ? t("Shows up after your first income")
            : saved < 0
              ? t("More went out than came in")
              : fillNodes(t("{rate} of income saved"), { rate: <b className="font-semibold text-ink">{toLocaleDigits(String(rate), fmt)}%</b> })}
        </span>
      </div>
    </div>
  );
}

// A new account's four plain figure cards (the DashboardEmpty board): no
// comparisons yet, a line saying what will show instead.
export function SetupFigures({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const tile = "flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5";
  const cards = [
    {
      label: "Total balance",
      value: data.balance,
      icon: <Wallet strokeWidth={2} aria-hidden="true" />,
      tile: "bg-emerald-soft text-emerald",
      note: t(data.wallets.length === 1 ? "In {count} wallet" : "In {count} wallets", { count: formatCount(data.wallets.length, fmt) }),
    },
    { label: "Income", value: data.income, icon: <ArrowDownLeft strokeWidth={2.25} aria-hidden="true" />, tile: "bg-mint-50 text-emerald", note: t("No income recorded this month") },
    { label: "Expense", value: data.expense, icon: <ArrowUpRight strokeWidth={2.25} aria-hidden="true" />, tile: "bg-expense-soft text-expense-fill", note: t("No expenses recorded this month") },
    { label: "Saved this month", value: Math.max(0, data.income - data.expense), icon: <PiggyBank strokeWidth={2} aria-hidden="true" />, tile: "bg-emerald-soft text-emerald", note: t("Shows up after your first income") },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={cn(CARD, "flex min-w-0 flex-col gap-3 p-4 md:p-5")}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn(LABEL, "text-ink-muted")}>{t(card.label)}</span>
            <span className={cn(tile, card.tile)}>{card.icon}</span>
          </div>
          <span className={cn("truncate text-[22px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums md:text-[28px]", card.value > 0 ? "text-ink" : "text-ink-faint")}>{formatCurrency(card.value, data.currency, fmt)}</span>
          <span className="text-caption text-ink-muted">{card.note}</span>
        </div>
      ))}
    </div>
  );
}
