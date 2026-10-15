"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { BUDGET_TONE_BAR, BUDGET_TONE_TEXT, budgetFor, budgetStatus, monthRangeOf, type Transfer } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, CategoryTile, categoryBarClass } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupDashboardProps {
  data: GroupPageData;
  view: GroupView;
  onRecordPayment: (transfer: Transfer) => void;
  onStatement: (member: GroupMember) => void;
  onSetBudget: () => void;
}

const ROW = "grid-cols-[minmax(0,1fr)_120px_88px_150px]";

// A group's month at a glance: the four figures, every member's balance,
// who pays whom, where the money went, and the last six months against
// the budget.
export function GroupDashboard({ data, view, onRecordPayment, onStatement, onSetBudget }: GroupDashboardProps) {
  const { t, locale } = useLocale();
  const { currency, range, settlement } = data;
  const month = monthName(range.key, locale);
  const spent = Number(settlement.totalExpense);
  const deposits = data.contributions.filter((c) => Number(c.amount) > 0);
  const contributed = deposits.reduce((sum, c) => sum + Number(c.amount), 0);
  const returned = data.contributions.filter((c) => Number(c.amount) < 0).reduce((sum, c) => sum - Number(c.amount), 0);
  const top = view.byCategory.slice(0, 2);
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const totalPaid = rows.reduce((sum, r) => sum + Number(r.row.contributed), 0);
  const totalCost = rows.reduce((sum, r) => sum + Number(r.row.share), 0);
  const maxMonth = Math.max(...view.byMonth.map((m) => m.amount), 1);
  const lastMonth = view.byMonth[view.byMonth.length - 1];
  const lastStatus = view.budget && lastMonth ? budgetStatus(view.budget.budget, lastMonth.amount) : null;

  const stats = [
    { label: t("Total expense"), value: formatCurrency(spent, currency), sub: top.length > 0 ? top.map((c) => `${c.name} ${formatCurrency(c.amount, currency)}`).join(" · ") : t("Nothing spent yet") },
    view.budget
      ? { label: `${month} ${t("budget")}`, value: formatCurrency(view.budget.budget, currency), sub: `${view.budget.percent}% ${t("used")} · ${view.budget.left < 0 ? `${formatCurrency(-view.budget.left, currency)} ${t("over")}` : `${formatCurrency(view.budget.left, currency)} ${t("left")}`}`, subTone: BUDGET_TONE_TEXT[view.budget.tone], subBold: view.budget.tone !== "ok" }
      : { label: `${month} ${t("budget")}`, value: "—", sub: t("No budget set"), action: onSetBudget },
    { label: t("Cash in hand"), value: formatCurrency(view.cash, currency), sub: t("matches all balances"), check: true, tone: view.cash < 0 ? "text-expense" : undefined },
    { label: t("Contributions"), value: formatCurrency(contributed, currency), sub: returned > 0 ? `${formatCurrency(returned, currency)} ${t("returned")}` : `${deposits.length} ${t(deposits.length === 1 ? "deposit" : "deposits")}` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex flex-col gap-2 px-5 py-4">
            <span className="text-small font-medium text-ink-muted">{stat.label}</span>
            <span className={cn("text-h1 tabular-nums", stat.tone)}>{stat.value}</span>
            {stat.action ? (
              <button type="button" onClick={stat.action} className="self-start text-caption font-semibold text-emerald hover:underline">
                {stat.sub} · {t("Set one")}
              </button>
            ) : (
              <span className={cn("flex items-center gap-1 text-caption", stat.subBold ? "font-semibold" : "font-normal", stat.subTone ?? "text-ink-muted")}>
                {stat.check && <Check className="size-3.5 text-income" aria-hidden="true" />}
                {stat.sub}
              </span>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Members' balances")}</h2>
            <Link href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: range.key } }} className="text-small font-semibold text-emerald hover:text-emerald-hover">
              {t("Open settlement")}
            </Link>
          </div>
          <div className={cn("hidden items-center gap-4 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
            <span>{t("Member")}</span>
            <span className="text-right">{t("Paid in")}</span>
            <span className="text-right">{t("Cost")}</span>
            <span className="text-right">{t("Balance")}</span>
          </div>
          {rows.length === 0 && <p className="border-t border-line px-5 py-8 text-center text-body text-ink-muted">{t("Add members to see their balances.")}</p>}
          {rows.map(({ row, member }) => (
            <button key={row.groupMemberId} type="button" onClick={() => member && onStatement(member)} className={cn("grid w-full items-center gap-4 border-b border-surface-sunken px-5 py-3 text-left text-body tabular-nums hover:bg-cream md:min-h-16 md:py-0", "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_120px_88px_150px]")}>
              <span className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={row.name} src={member?.photoUrl} size={34} coloured />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold text-ink">{row.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">
                    {formatCurrency(row.contributed, currency)} {t("paid in")} · {formatCurrency(row.share, currency)} {t("cost")}
                  </span>
                </span>
              </span>
              <span className="hidden text-right text-ink md:block">{formatCurrency(row.contributed, currency)}</span>
              <span className="hidden text-right text-ink md:block">{formatCurrency(row.share, currency)}</span>
              <BalanceCell value={Number(row.balance)} currency={currency} />
            </button>
          ))}
          {rows.length > 0 && (
            <>
              <div className={cn("grid h-12.5 items-center gap-4 bg-cream px-5 text-body font-semibold tabular-nums", "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_120px_88px_150px]")}>
                <span>{t("Total")}</span>
                <span className="hidden text-right md:block">{formatCurrency(totalPaid, currency)}</span>
                <span className="hidden text-right md:block">{formatCurrency(totalCost, currency)}</span>
                <span className={cn("text-right", view.cash < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(view.cash, currency)}</span>
              </div>
              <div className="flex items-center gap-2 border-t border-surface-sunken px-5 py-3 text-small text-ink-2">
                <Check className="size-4 shrink-0 text-income" aria-hidden="true" />
                {t("Balances add up to")} {formatCurrency(view.cash, currency)}, {t("the cash in hand. The account checks out.")}
              </div>
            </>
          )}
        </Card>

        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className="flex flex-col gap-0.5 border-b border-surface-sunken px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Who pays whom")}</h2>
            <span className="text-small text-ink-muted">
              {t("The fewest payments that make")} {month} {t("even")}
            </span>
          </div>
          {view.transfers.map((transfer) => {
            const from = view.memberById[transfer.fromId];
            const to = view.memberById[transfer.toId];
            return (
              <div key={`${transfer.fromId}-${transfer.toId}`} className="flex flex-col gap-3 border-b border-surface-sunken px-5 py-4">
                <div className="flex items-center gap-3">
                  <PersonAvatar name={from?.name ?? "?"} src={from?.photoUrl} size={34} coloured />
                  <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <PersonAvatar name={to?.name ?? "?"} src={to?.photoUrl} size={34} coloured />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">
                      {from?.name} {t("pays")} {to?.name}
                    </span>
                    <span className="truncate text-caption font-normal text-ink-muted">
                      {t("Clears")} {from?.name}
                      {t("'s")} {formatSignedCurrency(view.balances[transfer.fromId] ?? 0, currency)}
                    </span>
                  </span>
                  <span className="text-title font-bold text-ink tabular-nums">{formatCurrency(transfer.amount, currency)}</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onRecordPayment(transfer)} className="self-end">
                  {t("Record payment")}
                </Button>
              </div>
            );
          })}
          <div className="flex flex-1 items-start gap-2 bg-cream px-5 py-4 text-small leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>{view.transfers.length === 0 ? (spent > 0 ? t("Everyone is even. Nothing to settle.") : t("Record contributions and expenses, and the payments that settle the month show up here.")) : `${t("After")} ${view.transfers.length === 1 ? t("this payment") : `${t("these")} ${view.transfers.length} ${t("payments")}`} ${t("everyone is even. Or carry the balances into next month when you close.")}`}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-semibold text-ink">{t("Where the money went")}</h2>
            <span className="text-caption font-normal text-ink-muted">
              {month} · {t("shared equally")}
            </span>
          </div>
          {view.byCategory.length === 0 && <p className="py-4 text-center text-small text-ink-muted">{t("No expense yet this month.")}</p>}
          {view.byCategory.map((cat) => (
            <div key={cat.name} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-small">
                <CategoryTile name={cat.name} categories={data.categories} size={24} />
                <span className="truncate font-medium text-ink">{cat.name}</span>
                <Chip tone="neutral" size="sm" className="font-semibold">
                  {t("Equally")}
                </Chip>
                <span className="flex-1" />
                <span className="font-semibold text-ink tabular-nums">{formatCurrency(cat.amount, currency)}</span>
                <span className="w-11 text-right text-ink-muted tabular-nums">{cat.share}%</span>
              </div>
              <span className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-sunken", categoryBarClass(cat.name, data.categories))}>
                <span className="block h-full rounded-full bg-current" style={{ width: `${cat.share}%` }} />
              </span>
            </div>
          ))}
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-semibold text-ink">{t("Last 6 months against the budget")}</h2>
            {view.budget && (
              <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
                <span className="h-3 w-0.5 bg-ink" aria-hidden="true" />
                {t("Budget")} {formatCurrency(view.budget.budget, currency)}
              </span>
            )}
          </div>
          {view.byMonth.map((point) => {
            const monthBudget = budgetFor(data.budgets, monthRangeOf(point.month));
            const status = monthBudget ? budgetStatus(Number(monthBudget.budgetAmount), point.amount) : null;
            const scale = status ? status.budget * 1.1 : maxMonth;
            const last = point.month === range.key;
            return (
              <div key={point.month} className="grid h-7.5 grid-cols-[40px_minmax(0,1fr)_76px_52px] items-center gap-3 text-small tabular-nums">
                <span className={cn("text-ink-2", last ? "font-bold" : "font-medium")}>{monthName(point.month, locale, "short")}</span>
                <span className="relative h-3.5 rounded-sm bg-surface-sunken">
                  <span className={cn("absolute inset-y-0 left-0 rounded-sm", status ? BUDGET_TONE_BAR[status.tone] : "bg-emerald")} style={{ width: `${Math.min(100, (point.amount / scale) * 100)}%` }} />
                  {status && <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: "90.9%" }} aria-hidden="true" />}
                </span>
                <span className={cn("text-right text-ink", last ? "font-bold" : "font-medium")}>{formatCurrency(point.amount, currency)}</span>
                <span className={cn("text-right font-semibold", status ? BUDGET_TONE_TEXT[status.tone] : "text-ink-muted")}>{status ? `${status.percent}%` : "—"}</span>
              </div>
            );
          })}
          {lastStatus && (
            <span className="text-caption font-normal text-ink-muted">
              {month} {lastStatus.left < 0 ? `${t("went")} ${formatCurrency(-lastStatus.left, currency)} ${t("over")}` : `${t("is")} ${formatCurrency(lastStatus.left, currency)} ${t("under the budget so far")}`}
              {top[0] ? `, ${t("mostly")} ${top[0].name} (${formatCurrency(top[0].amount, currency)}).` : "."}
            </span>
          )}
        </Card>
      </div>
    </div>
  );
}
