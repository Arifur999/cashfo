"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Box, Eye, EyeOff, Landmark, PiggyBank, Sparkles, TrendingUp, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { typeLook } from "@/components/modules/Customer/Events/eventVisuals";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { clockText } from "@/lib/customer/eventsDisplay";
import { wordInitials } from "@/lib/customer/loanDisplay";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type FlowKey, flowBar, flowLines, percentOf, summaryFacts, worth, worthBar, worthShare, type WorthKey } from "./dashboardWorth";
import type { HomeData } from "./homeTypes";

// rp-*, db-*: the Dashboard board's own class names, which its premium skin
// (globals.css, data-skin="premium") styles in light mode.
export const BOARD_CARD = "rp-card min-w-0 rounded-card border border-line-card bg-surface shadow-card";
const H2 = "rp-h2 text-[17px] leading-[normal] font-semibold tracking-[-0.01em] text-ink";
const SUB = "rp-sub mt-0.5 text-small leading-[normal] text-ink-muted";
const LINK = "inline-flex items-center gap-1 text-small font-semibold whitespace-nowrap text-emerald hover:underline";
const BAR = "block h-2 overflow-hidden rounded-full bg-line-card";
const HIDDEN = "৳ ••••••";

// The amounts the eye on the net worth card hides (wealth, accounts,
// loans, assets), kept for this browser.
export function useAmountsHidden(): [boolean, () => void] {
  const [shown, setShown] = useStoredChoice("smartly-dashboard-amounts", ["shown", "hidden"] as const, "shown");
  return [shown === "hidden", () => setShown(shown === "hidden" ? "shown" : "hidden")];
}

function useMoney(data: HomeData) {
  const { fmt } = useLocale();
  return (value: number) => formatCurrency(value, data.currency, fmt);
}

// `arrow`: the board draws one after Full report only; Calendar and View all go without.
function Head({ title, sub, href, link, arrow = false }: { title: string; sub?: string; href?: string; link?: string; arrow?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={H2}>{title}</h2>
        {sub && <p className={SUB}>{sub}</p>}
      </div>
      {href && link && (
        <Link href={href} className={LINK}>
          {link}
          {arrow && <ArrowRight className="size-3.5" aria-hidden="true" />}
        </Link>
      )}
    </div>
  );
}

// The AI summary line under the title, from the period's own figures;
// closed for the period it was closed in.
export function AiSummaryLine({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const [state, setState] = useStoredChoice(`smartly-ai-line:${data.businessId}:${data.period.dateFrom}:${data.period.dateTo}`, ["shown", "closed"] as const, "shown");
  if (state === "closed") return null;
  const facts = summaryFacts({ income: data.income, expense: data.expense, biggest: data.biggestSpend, target: data.targets.income, budget: data.targets.budget });
  const percent = (value: number) => toLocaleDigits(String(value), fmt);
  const line = facts.empty
    ? t("No income or expense is recorded for {period} yet. Add a transaction to see where your money goes.", { period: data.period.label })
    : [
        t("In {period} you kept {percent}% of your income.", { period: data.period.label, percent: percent(facts.kept) }),
        facts.biggest && t("{name} was the biggest cost at {amount}.", { name: t(facts.biggest.name), amount: money(facts.biggest.amount) }),
        facts.target !== null && t("Income reached {percent}% of the target.", { percent: percent(facts.target) }),
        facts.budget !== null && t("Spending used {percent}% of the budget.", { percent: percent(facts.budget) }),
      ]
        .filter(Boolean)
        .join(" ");
  return (
    <section aria-label={t("AI summary")} className="-mt-1.5 flex items-center gap-3.5 rounded-[16px] border border-line-card bg-surface py-3 pr-3 pl-3.5 shadow-[0_1px_2px_rgba(18,32,29,0.04)] max-md:hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-mint-50 text-emerald">
        <Sparkles className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-caption font-semibold text-emerald">{t("AI summary")}</span>
        <span className="text-body leading-[1.45] text-ink-2">{line}</span>
      </span>
      <Link href="/ai-insights" className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-input bg-surface px-3.5 text-small font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
        {t("See all insights")}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
      <button type="button" onClick={() => setState("closed")} aria-label={t("Hide the summary")} title={t("Hide the summary")} className="flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}

// Your net worth today on the forest card, how far it moved since last
// month ended, and what you own against what you owe.
export function NetWorthHero({ data, hidden, onToggle }: { data: HomeData; hidden: boolean; onToggle: () => void }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const mask = (text: string) => (hidden ? HIDDEN : text);
  const { own, owe, net } = worth(data.worth.parts);
  const change = data.worth.change;
  return (
    <section aria-label={t("Your net worth")} className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-[20px] bg-worth-hero px-6 py-5.5 text-white shadow-[0_10px_30px_rgba(15,63,56,0.25)]">
      <span aria-hidden="true" className="absolute -top-17.5 -right-17.5 size-55 rounded-full border-[28px] border-white/5" />
      <div className="relative flex items-center justify-between gap-2.5">
        <span className="flex items-center gap-2 text-body font-medium text-hero-sage">
          {t("Your net worth")}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] text-hero-mist">{t("Today")}</span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={hidden}
          aria-label={t(hidden ? "Show amounts" : "Hide amounts")}
          title={t(hidden ? "Show amounts" : "Hide amounts")}
          className="flex size-8.5 items-center justify-center rounded-[10px] border border-white/18 bg-white/6 text-hero-mist hover:bg-white/12"
        >
          {hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div className="relative flex flex-col gap-2">
        <span className="rp-num rp-nw text-[38px] leading-[1.1] font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums max-sm:text-[30px]">{mask(money(net))}</span>
        {change !== null && (
          <span className="flex flex-wrap items-center gap-2 text-small text-hero-sage">
            <span className={cn("rounded-full px-2.25 py-[3px] font-semibold tabular-nums", change >= 0 ? "bg-worth-up/18 text-worth-up" : "bg-worth-down/18 text-worth-down")}>
              {hidden ? "••••" : change === 0 ? "±0" : formatSignedCurrency(change, data.currency, fmt)}
            </span>
            {t("since {day}", { day: formatDay(data.worth.since, "d MMMM yyyy", fmt) })}
          </span>
        )}
      </div>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 rounded-[14px] border border-white/10 bg-white/7 p-3.5">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption text-hero-sage">{t("You own")}</span>
          <span className="truncate text-[17px] font-semibold tabular-nums">{mask(money(own))}</span>
        </span>
        <span aria-hidden="true" className="flex size-6.5 items-center justify-center rounded-full bg-white/12 text-[16px] font-semibold text-hero-mist">
          –
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption text-hero-sage">{t("You owe")}</span>
          <span className="truncate text-[17px] font-semibold text-worth-down tabular-nums">{mask(money(owe))}</span>
        </span>
      </div>
      <p className="relative text-[12.5px] leading-normal text-worth-note">{t("Everything you own (accounts, savings, assets, investments and money people owe you) minus every loan you still have to repay.")}</p>
    </section>
  );
}

const WEALTH: Record<WorthKey, { label: string; Icon: LucideIcon; tile: string; bar: string; href: string }> = {
  cash: { label: "Money in accounts", Icon: Landmark, tile: "bg-mint-50 text-emerald", bar: "bg-emerald", href: "/balance/accounts" },
  savings: { label: "Savings goals", Icon: PiggyBank, tile: "bg-warning-soft text-warning", bar: "bg-cat-11", href: "/savings-goals/dashboard" },
  assets: { label: "Assets", Icon: Box, tile: "bg-tint-blue text-tint-blue-ink", bar: "bg-info", href: "/assets-management/dashboard" },
  investments: { label: "Investments", Icon: TrendingUp, tile: "bg-tint-teal text-tint-teal-ink", bar: "bg-cat-9", href: "/investments/dashboard" },
  pawna: { label: "People owe you (pawna)", Icon: ArrowDownLeft, tile: "bg-tint-violet text-tint-violet-ink", bar: "bg-cat-3", href: "/loan-management/dashboard" },
  dena: { label: "You owe (dena)", Icon: ArrowUpRight, tile: "bg-expense-soft text-expense", bar: "bg-expense-fill", href: "/loan-management/dashboard" },
};

// Where your wealth is: a bar of the parts, and each part with its share.
export function WealthCard({ data, hidden }: { data: HomeData; hidden: boolean }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const { parts, counts } = data.worth;
  const count = (value: number) => formatCount(value, fmt);
  const subs: Record<WorthKey, string> = {
    cash: t("{count} bank, mobile and cash accounts", { count: count(counts.accounts) }),
    savings: t("{count} goals in savings accounts", { count: count(counts.goals) }),
    assets: t("{count} assets at today's value", { count: count(counts.assets) }),
    investments: t("{count} investments, capital still in", { count: count(counts.investments) }),
    pawna: t("From {count} people", { count: count(counts.pawna) }),
    dena: t("To {count} lenders, still to repay", { count: count(counts.dena) }),
  };
  return (
    <section aria-label={t("Where your wealth is")} className={cn(BOARD_CARD, "flex flex-col gap-3.5 px-5.5 py-5")}>
      <Head title={t("Where your wealth is")} sub={t("Each part of your net worth, with its share")} href="/reports/detailed" link={t("Full report")} arrow />
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-line-card">
        {worthBar(parts).map((bar) => (
          <span key={bar.key} title={`${t(WEALTH[bar.key].label)}: ${hidden ? HIDDEN : money(parts[bar.key])}`} className={WEALTH[bar.key].bar} style={{ width: `${bar.width}%` }} />
        ))}
      </div>
      <div className="flex flex-col">
        {(Object.keys(WEALTH) as WorthKey[]).map((key, index) => {
          const look = WEALTH[key];
          return (
            <Link key={key} href={look.href} className={cn("db-row -mx-1.5 grid grid-cols-[36px_minmax(0,1fr)_auto_64px] items-center gap-x-3 rounded-[12px] px-1.5 py-2 text-ink transition-colors hover:bg-row-hover", index > 0 && "border-t border-divider")}>
              <span className={cn("flex size-9 items-center justify-center rounded-[10px]", look.tile)}>
                <look.Icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium">{t(look.label)}</span>
                <span className="truncate text-caption text-ink-faint">{subs[key]}</span>
              </span>
              <span className={cn("text-[15px] font-semibold whitespace-nowrap tabular-nums", key === "dena" && "text-expense")}>
                {hidden ? HIDDEN : key === "dena" ? `– ${money(parts.dena)}` : money(parts[key])}
              </span>
              <span className="text-right text-caption text-ink-faint tabular-nums">{toLocaleDigits(`${worthShare(parts, key)}%`, fmt)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// The four period cards: income against the target, expense against the
// budget, what was kept, and the net cash flow after everything else.
export function KpiCards({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const percent = (value: number) => toLocaleDigits(`${value}%`, fmt);
  const signed = (value: number) => (value === 0 ? money(0) : formatSignedCurrency(value, data.currency, fmt));
  const { income, expense } = data;
  const saved = income - expense;
  const keptRate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const incomeRate = percentOf(income, data.targets.income);
  const budgetRate = percentOf(expense, data.targets.budget);
  const net = data.flow ? flowLines(data.flow).net : null;
  const vs = data.compare ? t("vs {month}", { month: data.compare.label }) : "";
  const delta = (now: number, before: number | undefined, goodUp: boolean) => {
    if (!before) return null;
    const change = Math.round(((now - before) / Math.abs(before)) * 1000) / 10;
    const good = change === 0 ? null : change > 0 === goodUp;
    return { text: `${change > 0 ? "+" : change < 0 ? "–" : ""}${toLocaleDigits(String(Math.abs(change)), fmt)}%`, tone: good === null ? "bg-surface-sunken text-ink-soft" : good ? "bg-success-soft text-tint-green-ink" : "bg-expense-soft text-expense" };
  };
  const cards: { label: string; Icon: LucideIcon; tile: string; value: string; valueTone: string; href: string; bar: { width: number; tone: string } | null; pill: ReturnType<typeof delta>; sub: string }[] = [
    {
      label: t("Income"),
      Icon: ArrowDownLeft,
      tile: "bg-mint-50 text-emerald-fill",
      value: money(income),
      valueTone: "text-emerald-fill",
      href: "/income-expense",
      bar: incomeRate !== null ? { width: Math.min(100, incomeRate), tone: incomeRate >= 100 ? "bg-tint-green-ink" : "bg-emerald" } : null,
      pill: incomeRate === null ? delta(income, data.compare?.income, true) : null,
      sub: incomeRate !== null && data.targets.income ? t("{percent} of the {amount} target", { percent: percent(incomeRate), amount: money(data.targets.income) }) : vs,
    },
    {
      label: t("Expense"),
      Icon: ArrowUpRight,
      tile: "bg-expense-soft text-expense-fill",
      value: money(expense),
      valueTone: "text-expense-fill",
      href: "/income-expense",
      bar: budgetRate !== null ? { width: Math.min(100, budgetRate), tone: budgetRate > 100 ? "bg-expense-fill" : budgetRate >= 85 ? "bg-warning-fill" : "bg-emerald" } : null,
      pill: budgetRate === null ? delta(expense, data.compare?.expense, false) : null,
      sub:
        data.targets.budget !== null
          ? expense <= data.targets.budget
            ? t("{amount} left of the budget", { amount: money(data.targets.budget - expense) })
            : t("{amount} over the budget", { amount: money(expense - data.targets.budget) })
          : vs,
    },
    {
      label: t("Saved"),
      Icon: PiggyBank,
      tile: "bg-warning-soft text-warning",
      value: signed(saved),
      valueTone: saved < 0 ? "text-expense-fill" : "text-ink",
      href: "/categories",
      bar: income > 0 ? { width: Math.max(0, Math.min(100, keptRate)), tone: "bg-cat-11" } : null,
      pill: null,
      sub: income > 0 ? t("{percent} of income kept", { percent: percent(keptRate) }) : t("No income yet"),
    },
    {
      label: t("Net cash flow"),
      Icon: ArrowLeftRight,
      tile: "bg-emerald-wash text-emerald",
      value: net === null ? "—" : signed(net),
      valueTone: net !== null && net < 0 ? "text-expense-fill" : "text-tint-green-ink",
      href: "/reports/detailed",
      bar: null,
      pill: null,
      sub: t("After savings, loans and investments"),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className={cn(BOARD_CARD, "db-kpi flex flex-col gap-2 px-4.5 py-4 text-ink transition-[border-color,box-shadow] hover:border-hero-sage hover:shadow-float")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-medium text-ink-muted">{card.label}</span>
            <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", card.tile)}>
              <card.Icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <span className={cn("rp-num rp-kpi text-[24px] font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums", card.valueTone)}>{card.value}</span>
          {card.bar && (
            <span className="rp-bar block h-1.5 overflow-hidden rounded-full bg-line-card">
              <span className={cn("block h-full rounded-full", card.bar.tone)} style={{ width: `${card.bar.width}%` }} />
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-muted">
            {card.pill && <span className={cn("rounded-full px-1.75 py-0.5 font-semibold tabular-nums", card.pill.tone)}>{card.pill.text}</span>}
            <span className="truncate">{card.sub}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const FLOW_LABEL: Record<FlowKey, string> = { income: "Income", expenses: "Expenses", savings: "Savings goals", loans: "Loans", assets: "Assets", investments: "Investments", gifts: "Event gifts" };

// Cash flow: each way money moved in the period, in or out from the middle.
export function CashFlowCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const signed = (value: number) => formatSignedCurrency(value, data.currency, fmt);
  const flow = data.flow;
  if (!flow) {
    return (
      <section className={cn(BOARD_CARD, "flex flex-col gap-2.5 px-5.5 py-5 xl:col-span-2")}>
        <Head title={t("Cash flow")} sub={t("Money in and out in {period}", { period: data.period.label })} />
        <p className="py-8 text-center text-body text-ink-muted">{t("Couldn't load the cash flow. Reload the page to try again.")}</p>
      </section>
    );
  }
  const { lines, net } = flowLines(flow);
  const largest = Math.max(1, ...lines.map((line) => Math.abs(line.value)));
  const subs: Record<FlowKey, string> = {
    income: plural(t, flow.income.count, "{count} entry", "{count} entries", undefined, fmt),
    expenses: t("Bills, food, rent and the rest"),
    savings: flow.savings.takenOut ? t("Added {added} · took out {out}", { added: money(flow.savings.added), out: money(flow.savings.takenOut) }) : t("Added {added}", { added: money(flow.savings.added) }),
    loans: t("Took {in} · paid out {out}", { in: money(flow.loans.took + flow.loans.gotBack), out: money(flow.loans.gave + flow.loans.paidBack) }),
    assets: t("Bought {bought} · sold {sold}", { bought: money(flow.assets.bought), sold: money(flow.assets.sold) }),
    gifts: t("Gave {gave} · got {got}", { gave: money(flow.gifts.gave), got: money(flow.gifts.got) }),
    investments: t("Put in {put} · profit {profit} · back {back}", { put: money(flow.investments?.put ?? 0), profit: money(flow.investments?.profit ?? 0), back: money(flow.investments?.back ?? 0) }),
  };
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-2.5 px-5.5 py-5 xl:col-span-2")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={H2}>{t("Cash flow")}</h2>
          <p className={SUB}>{t("Money in and out in {period}", { period: data.period.label })}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-caption text-ink-muted">{t("Net")}</span>
          <span className={cn("rp-num rp-n20 text-[20px] font-semibold tabular-nums", net < 0 ? "text-expense" : "text-tint-green-ink")}>{net === 0 ? money(0) : signed(net)}</span>
        </div>
      </div>
      <div className="flex flex-col">
        {lines.map((line) => {
          const bar = flowBar(line.value, largest);
          return (
            <div key={line.key} className="grid grid-cols-[minmax(0,210px)_minmax(0,1fr)_120px] items-center gap-x-3.5 border-b border-divider py-2 max-sm:grid-cols-[minmax(0,1fr)_96px]">
              <span className="flex min-w-0 flex-col">
                <span className="text-[13.5px] font-medium text-ink">{t(FLOW_LABEL[line.key])}</span>
                <span className="truncate text-[11.5px] text-ink-faint">{subs[line.key]}</span>
              </span>
              <span className="relative block h-3 max-sm:hidden">
                <span aria-hidden="true" className="absolute -top-1 -bottom-1 left-1/2 w-px bg-input" />
                <span className={cn("absolute inset-y-0 rounded-[4px]", line.value >= 0 ? "bg-chart-savings" : "bg-chart-expense/70")} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
              </span>
              <span className={cn("text-right text-[13.5px] font-semibold whitespace-nowrap tabular-nums", line.value > 0 ? "text-tint-green-ink" : line.value < 0 ? "text-expense" : "text-ink-faint")}>{line.value ? signed(line.value) : "–"}</span>
            </div>
          );
        })}
      </div>
      <span className="flex items-center gap-3.5 text-caption text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-savings" aria-hidden="true" />
          {t("Money in")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-expense/70" aria-hidden="true" />
          {t("Money out")}
        </span>
      </span>
    </section>
  );
}

// The next invitations and your own events.
export function UpcomingEventsCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const events = data.events ?? [];
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3 px-5.5 py-5")}>
      <Head title={t("Upcoming events")} sub={t("Weddings, aqiqah and other invitations")} href="/events" link={t("Calendar")} />
      <div className="flex flex-col gap-2">
        {events.map((event) => {
          const look = typeLook(event.type);
          return (
            <Link key={event.id} href={`/events?day=${event.date}`} className="db-row -mx-1.5 grid grid-cols-[46px_minmax(0,1fr)] items-center gap-x-3 rounded-[12px] p-1.5 text-ink transition-colors hover:bg-row-hover">
              <span className={cn("flex h-12 w-11.5 flex-col items-center justify-center rounded-[12px] leading-[1.05]", look.bg, look.fg)}>
                <span className="text-[17px] font-bold">{toLocaleDigits(String(Number(event.date.slice(8))), fmt)}</span>
                <span className="text-[11px] font-semibold">{formatDay(event.date, "MMM", fmt)}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold">{event.title}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-caption text-ink-faint">
                  <span className={cn("rounded-full px-1.75 py-px text-[11px] font-semibold whitespace-nowrap", look.bg, look.fg)}>{t(look.label)}</span>
                  <span className="truncate">{[event.time && clockText(event.time, t, (text) => toLocaleDigits(text, fmt)), event.place].filter(Boolean).join(" · ")}</span>
                </span>
              </span>
            </Link>
          );
        })}
        {events.length === 0 && <span className="text-small text-ink-faint">{data.events === null ? t("Events show here for the owner and accountants.") : t("Nothing coming up. Add an invitation in Calendar & Events.")}</span>}
      </div>
    </section>
  );
}

// Savings goals: the three furthest along, each against its target.
export function GoalsCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3.5 px-5.5 py-5")}>
      <Head title={t("Savings goals")} sub={t("{saved} saved of {target}", { saved: money(data.savings.saved), target: money(data.savings.target) })} href="/savings-goals/dashboard" link={t("View all")} />
      {data.goalRows.map((goal) => {
        const percent = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0;
        return (
          <div key={goal.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
              <span className="truncate font-medium text-ink">{goal.name}</span>
              <span className="text-[12.5px] whitespace-nowrap text-ink-muted tabular-nums">
                {money(goal.saved)} / {money(goal.target)}
              </span>
            </div>
            <span className={cn(BAR, "h-1.75")}>
              {/* Each goal in its own card colour, as the board draws it. */}
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: goal.color }} />
            </span>
            <span className="text-caption text-ink-faint">{t(goal.paused ? "{percent}% saved · paused" : "{percent}% saved", { percent: toLocaleDigits(String(percent), fmt) })}</span>
          </div>
        );
      })}
      {data.goalRows.length === 0 && <span className="text-small text-ink-faint">{t("No goals yet. Start one in Savings Goals.")}</span>}
    </section>
  );
}

// Loans: what people owe you and what you owe, and the biggest on each side.
export function LoansCard({ data, hidden }: { data: HomeData; hidden: boolean }) {
  const { t } = useLocale();
  const money = useMoney(data);
  const mask = (text: string) => (hidden ? HIDDEN : text);
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3 px-5.5 py-5")}>
      <Head title={t("Loans")} sub={t("Who owes you and whom you owe")} href="/loan-management/dashboard" link={t("View all")} />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rp-tile flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-success-soft bg-note-green px-3.5 py-3">
          <span className="truncate text-caption text-tint-green-ink">{t("Pawna")}</span>
          <span className="rp-tv text-[17px] font-semibold whitespace-nowrap text-tint-green-ink tabular-nums">{mask(money(data.worth.parts.pawna))}</span>
        </div>
        <div className="rp-tile flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-expense-soft bg-expense-soft/40 px-3.5 py-3">
          <span className="truncate text-caption text-expense">{t("Dena")}</span>
          <span className="rp-tv text-[17px] font-semibold whitespace-nowrap text-expense tabular-nums">{mask(money(data.worth.parts.dena))}</span>
        </div>
      </div>
      <div className="flex flex-col">
        {data.loanPeople.map((person) => {
          const owesYou = person.balance > 0;
          return (
            <Link key={person.id} href={`/loan-management/ledger?contactId=${encodeURIComponent(person.id)}`} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-divider py-1.75 text-ink hover:bg-row-hover">
              <span className={cn("flex size-7.5 items-center justify-center rounded-full text-[11.5px] font-bold", owesYou ? "bg-success-soft text-tint-green-ink" : "bg-expense-soft text-expense")}>{wordInitials(person.name)}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-medium">{person.name}</span>
                <span className="text-[11.5px] text-ink-faint">{t(owesYou ? "Owes you" : "You owe")}</span>
              </span>
              <span className={cn("text-[13.5px] font-semibold whitespace-nowrap tabular-nums", owesYou ? "text-tint-green-ink" : "text-expense")}>{mask(money(Math.abs(person.balance)))}</span>
            </Link>
          );
        })}
        {data.loanPeople.length === 0 && <span className="border-t border-divider pt-3 text-small text-ink-faint">{t("No loans either way.")}</span>}
      </div>
    </section>
  );
}

// Assets: today's value against what they cost, and the biggest four.
export function AssetsCard({ data, hidden }: { data: HomeData; hidden: boolean }) {
  const { t, fmt } = useLocale();
  const money = useMoney(data);
  const mask = (text: string) => (hidden ? HIDDEN : text);
  const signed = (value: number) => (value === 0 ? "±0" : formatSignedCurrency(value, data.currency, fmt));
  const total = data.worth.parts.assets;
  const cost = data.assetRows.length === data.worth.counts.assets ? data.assetRows.reduce((sum, row) => sum + row.cost, 0) : null;
  const gain = cost === null || data.worth.counts.assets === 0 ? null : total - cost;
  return (
    <section className={cn(BOARD_CARD, "flex flex-col gap-3 px-5.5 py-5")}>
      <Head title={t("Assets")} sub={t("{count} assets you own", { count: formatCount(data.worth.counts.assets, fmt) })} href="/assets-management/dashboard" link={t("View all")} />
      <div className="rp-tile rp-tile-plain flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-line-card bg-table-head px-3.5 py-3">
        <span className="truncate text-caption text-ink-muted">{t("Total value today")}</span>
        <span className="rp-tv text-[17px] font-semibold whitespace-nowrap text-tint-blue-ink tabular-nums">{mask(money(total))}</span>
        {gain !== null && !hidden && (
          <span className={cn("text-caption font-semibold tabular-nums", gain >= 0 ? "text-tint-green-ink" : "text-expense")}>
            {t(gain >= 0 ? "Up {amount} since you bought them" : "Down {amount} since you bought them", { amount: money(Math.abs(gain)) })}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        {data.assetRows.map((asset) => {
          const change = asset.value - asset.cost;
          return (
            <div key={asset.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-divider py-1.75">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-medium text-ink">{asset.name}</span>
                <span className="text-[11.5px] text-ink-faint">{t(asset.category)}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-[13.5px] font-semibold whitespace-nowrap text-ink tabular-nums">{mask(money(asset.value))}</span>
                {!hidden && <span className={cn("text-[11.5px] font-semibold tabular-nums", change > 0 ? "text-tint-green-ink" : change < 0 ? "text-expense" : "text-ink-faint")}>{signed(change)}</span>}
              </span>
            </div>
          );
        })}
        {data.assetRows.length === 0 && <span className="border-t border-divider pt-3 text-small text-ink-faint">{t("No assets yet.")}</span>}
      </div>
    </section>
  );
}
