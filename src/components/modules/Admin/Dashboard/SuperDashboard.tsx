"use client";

import { Bug, CreditCard, Gift, MessageCircle, ShieldAlert } from "lucide-react";
import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { DashboardPeriod, IDashboardOverview } from "@/types/dashboard.types";
import { ActivityCard } from "./ActivityCard";
import { monthLabel } from "./dashboardDates";
import { DashboardHeader } from "./DashboardHeader";
import { PlanShareCard } from "./PlanShareCard";
import { RevenueCard, SignupsCard } from "./TrendCards";
import { NeedsYou, Kpi, type Attention, type ChipTone } from "./pieces";
import { SystemCard, type ApiCheck } from "./SystemCard";

interface SuperDashboardProps {
  adminName: string;
  hour: number;
  summary: IDashboardOverview;
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

const PERIOD_DAYS: Record<DashboardPeriod, string> = { "7d": "in 7 days", "30d": "in 30 days", "90d": "in 90 days" };

// The super admin's dashboard as the AdminDashboard board lays it out: what
// needs action first, then users and money, the sign-ups and revenue
// charts, and plans, admin activity and system health. One call
// (GET /admin/dashboard/summary) feeds it; a card a role can't see comes
// back null and stays off the page, so a finance or content admin gets the
// same page cut to their work.
export function SuperDashboard({ adminName, hour, summary, api, now }: SuperDashboardProps) {
  const { translate, locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const percent = (value: number) => toLocaleDigits(`${value}%`, locale);
  const signed = (value: number) => `${value > 0 ? "+" : ""}${percent(value)}`;
  const money = (value: number | string) => formatAmount(value, undefined, locale);
  const { attention } = summary;

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
      href: "/admin/support?status=OPEN",
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

  const paid = summary.paidUsers;
  const mrrChange = summary.mrrChangePct;
  const lastMonth = summary.revenueByMonth?.at(-1)?.month ?? null;
  const mrrNote = [mrrChange !== null && lastMonth ? translate("vs {month}", { month: monthLabel(lastMonth, locale, translate) }) : null, summary.arr !== null ? translate("ARR {amount}", { amount: money(summary.arr) }) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4.5">
      <DashboardHeader name={adminName} hour={hour} summary={summary} />
      <NeedsYou items={cards} />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Kpi
          size="lg"
          label="Total users"
          value={count(summary.users.total)}
          chip={{ text: summary.users.newInPeriod > 0 ? `+${count(summary.users.newInPeriod)}` : count(0), tone: changeTone(summary.users.newInPeriod) }}
          note={PERIOD_DAYS[summary.period]}
          className={PHONE_KPI}
        />
        <Kpi size="lg" label="Active in 30 days" value={count(summary.activeLast30d)} chip={{ text: percent(summary.activePct), tone: "neutral" }} note="of accounts" className={PHONE_KPI} />
        {paid && (
          <Kpi
            size="lg"
            label="Paid users"
            value={count(paid.total)}
            chip={{ text: percent(paid.pctOfAccounts), tone: "neutral" }}
            note={paid.byPlan.length > 0 ? paid.byPlan.map((plan) => `${plan.planName ?? "—"} ${count(plan.count)}`).join(" · ") : "of accounts"}
            className={PHONE_KPI}
          />
        )}
        {summary.mrr !== null && (
          <Kpi
            size="lg"
            hero
            label="MRR"
            value={money(summary.mrr)}
            chip={mrrChange !== null ? { text: signed(mrrChange), tone: changeTone(mrrChange) } : null}
            note={mrrNote || undefined}
            className={cn(PHONE_KPI, money(summary.mrr).length > 11 && "max-sm:[&>span:nth-child(2)]:text-h3")}
          />
        )}
      </div>

      <div className={cn("grid gap-3.5", summary.revenueByMonth && "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]")}>
        <SignupsCard period={summary.period} days={summary.signupsPerDay} newInPeriod={summary.users.newInPeriod} newLast7d={summary.users.newLast7d} />
        {summary.revenueByMonth && <RevenueCard months={summary.revenueByMonth} changePct={summary.revenueChangePct} />}
      </div>

      <div className="grid items-stretch gap-3.5 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
        {summary.accountsByPlan && <PlanShareCard plans={summary.accountsByPlan} deletedLeftOut={summary.deletedLeftOut} />}
        {summary.recentAuditLogs && <ActivityCard logs={summary.recentAuditLogs} />}
        {summary.system && <SystemCard system={summary.system} api={api} />}
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
