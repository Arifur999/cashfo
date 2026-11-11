"use client";

import { Bug, CreditCard, Gift, MessageCircle, ShieldAlert } from "lucide-react";
import { monthOnlyLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { monthKeyOf, previousMonth } from "@/lib/adminPeriod";
import type { Period } from "@/lib/customer/period";
import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { takaSign } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { IDashboardPeriodOverview } from "@/types/dashboard.types";
import { ActivityCard } from "./ActivityCard";
import { DashboardHeader } from "./DashboardHeader";
import { compactAmount } from "./dashboardFigures";
import { usePeriodWords } from "./periodWords";
import { PlanShareCard } from "./PlanShareCard";
import { RevenueCard, SignupsCard } from "./TrendCards";
import { NeedsYou, Kpi, type Attention, type ChipTone } from "./pieces";
import { SystemCard, type ApiCheck } from "./SystemCard";

interface SuperDashboardProps {
  adminName: string;
  hour: number;
  overview: IDashboardPeriodOverview;
  // The period the page shows, as its address names it.
  period: Period;
  // YYYY-MM-DD on the platform's calendar, read on the server.
  today: string;
  // The API's own health check, timed from this server.
  api: ApiCheck;
  // The server's clock, so the "waited 6 hours" the server prints and the
  // one the browser hydrates are the same text.
  now: number;
}

// Two KPIs to a row on a phone (a 171px card at 390px): there the figure
// steps down to h2 with a little less inset, so a lakh-sized MRR still fits.
const PHONE_KPI = "max-sm:px-4 max-sm:[&>span:nth-child(2)]:text-h2";

// A change is good news only when it is above zero: no change is grey.
const changeTone = (value: number): ChipTone => (value > 0 ? "income" : value < 0 ? "expense" : "neutral");

// The super admin's dashboard as the AdminDashboard board lays it out: what
// needs action first, then users and money for the period the picker shows
// (this month unless another is picked), the sign-ups and revenue charts,
// and plans, admin activity and system health. One call
// (GET /admin/dashboard/overview?from&to) feeds it; a card a role can't see
// comes back null and stays off the page.
export function SuperDashboard({ adminName, hour, overview, period, today, api, now }: SuperDashboardProps) {
  const { translate, locale, fmt } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const percent = (value: number, digits?: number) => toLocaleDigits(`${digits === undefined ? value : value.toFixed(digits)}%`, locale);
  const money = (value: number | string) => formatAmount(value, undefined, locale);
  const { attention, range } = overview;
  const cash = overview.money;

  const cards: Attention[] = [];
  if (attention.payoutRequests) {
    cards.push({
      count: attention.payoutRequests.count,
      title: translate("Payout requests"),
      sub: translate("{amount} waiting for review", { amount: money(attention.payoutRequests.amount) }),
      link: translate("Review"),
      href: "/admin/referrals",
      icon: <Gift />,
      tone: "warning",
    });
  }
  if (attention.ticketsNoReply) {
    const since = attention.ticketsNoReply.oldestWaitingSince;
    cards.push({
      count: attention.ticketsNoReply.count,
      title: translate("Tickets with no reply"),
      sub: since ? translate("The oldest has waited {time}", { time: waitedFor(since, now, translate, locale) }) : translate("Nobody is waiting"),
      link: translate("Open inbox"),
      href: "/admin/support?status=NEEDS_REPLY",
      icon: <MessageCircle />,
      tone: "info",
    });
  }
  if (attention.failedPayments7d) {
    cards.push({
      count: attention.failedPayments7d.count,
      title: translate("Failed payments"),
      sub: translate("In the last 7 days"),
      link: translate("See payments"),
      href: "/admin/payments?status=FAILED",
      icon: <CreditCard />,
      tone: "expense",
    });
  }
  if (attention.securityFlags) {
    cards.push({
      count: attention.securityFlags.open,
      title: translate("Security flags"),
      sub: translate("{count} marked high", { count: count(attention.securityFlags.high) }),
      link: translate("Review flags"),
      href: "/admin/security/flags",
      icon: <ShieldAlert />,
      tone: "expense",
    });
  }
  if (attention.newErrors24h) {
    cards.push({
      count: attention.newErrors24h.count,
      title: translate("New errors"),
      sub: translate("Last 24 hours · {count} high", { count: count(attention.newErrors24h.high) }),
      link: translate("Error log"),
      href: "/admin/system/errors?within=24h",
      icon: <Bug />,
      tone: "neutral",
    });
  }

  // "this month", "in September", "in 2025" or "in this period".
  const { inPeriod, activeLabel } = usePeriodWords(period, today);

  // MRR: a month against the month before it ("+20.5%"); a year or other
  // days by how much it moved since they began ("+TK 3.2k").
  let mrrChip: { text: string; tone: ChipTone } | null = null;
  let mrrNote = "";
  if (cash) {
    const { pct, amount } = cash.mrrChange;
    const monthKey = monthKeyOf(period);
    if (pct === null) {
      mrrChip = amount > 0 ? { text: translate("New"), tone: "income" } : null;
    } else if (period.kind === "month") {
      mrrChip = { text: toLocaleDigits(`${pct < 0 ? "−" : "+"}${Math.abs(pct).toFixed(1)}%`, locale), tone: changeTone(pct) };
    } else {
      const abs = Math.abs(amount);
      const shown = abs >= 1000 ? `${takaSign(locale)} ${compactAmount(abs)}` : formatAmount(abs, undefined, locale);
      mrrChip = { text: toLocaleDigits(`${amount < 0 ? "−" : "+"}${shown}`, locale), tone: changeTone(amount) };
    }
    const vs = period.kind === "month" && pct !== null && monthKey ? translate("vs {month}", { month: monthOnlyLabel(Number(previousMonth(monthKey).slice(5, 7)), fmt) }) : null;
    mrrNote = [vs, translate("ARR {amount}", { amount: money(cash.arr) })].filter(Boolean).join(" · ");
  }
  const paidNote = cash ? (cash.paidUsers.byPlan.length > 0 ? cash.paidUsers.byPlan.map((plan) => `${plan.planName ?? "—"} ${count(plan.count)}`).join(" · ") : translate("of accounts")) : "";

  return (
    <div className="flex flex-col gap-4.5">
      <DashboardHeader name={adminName} hour={hour} overview={overview} period={period} today={today} />
      <NeedsYou items={cards} />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Kpi
          size="lg"
          label="Total users"
          value={count(overview.users.total)}
          chip={{ text: overview.users.newInPeriod > 0 ? `+${count(overview.users.newInPeriod)}` : count(0), tone: changeTone(overview.users.newInPeriod) }}
          note={inPeriod}
          className={PHONE_KPI}
        />
        <Kpi size="lg" label={activeLabel} value={count(overview.active.count)} chip={{ text: percent(Math.round(overview.active.pct)), tone: "neutral" }} note="of accounts" className={PHONE_KPI} />
        {cash && <Kpi size="lg" label="Paid users" value={count(cash.paidUsers.total)} chip={{ text: percent(cash.paidUsers.pctOfAccounts, 1), tone: "neutral" }} note={paidNote} className={PHONE_KPI} />}
        {cash && (
          <Kpi
            size="lg"
            hero
            label="MRR"
            value={money(cash.mrr)}
            chip={mrrChip}
            note={mrrNote || undefined}
            className={cn(PHONE_KPI, money(cash.mrr).length > 11 && "max-sm:[&>span:nth-child(2)]:text-h3")}
          />
        )}
      </div>

      <div className={cn("grid gap-3.5", cash && "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]")}>
        <SignupsCard range={range} period={period} signups={overview.signups} newInPeriod={overview.users.newInPeriod} newLast7d={overview.users.newLast7d} today={today} />
        {cash && <RevenueCard range={range} period={period} revenue={cash.revenue} today={today} />}
      </div>

      <div className="grid items-stretch gap-3.5 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        {cash && <PlanShareCard plans={cash.accountsByPlan} deletedLeftOut={cash.deletedLeftOut} on={range.isNow ? null : range.to} />}
        {overview.recentAuditLogs && <ActivityCard logs={overview.recentAuditLogs} />}
        {overview.system && <SystemCard system={overview.system} api={api} />}
      </div>
    </div>
  );
}

// "6 hours", then "3 days" from two days on: how long the oldest ticket
// with no reply has waited.
function waitedFor(since: string, now: number, t: Translate, locale: Locale): string {
  const hours = Math.max(1, Math.floor((now - Date.parse(since)) / 3_600_000));
  return hours < 48 ? plural(t, hours, "{count} hour", "{count} hours", undefined, locale) : plural(t, Math.floor(hours / 24), "{count} day", "{count} days", undefined, locale);
}
