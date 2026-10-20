"use client";

import { ArrowRight, Check, ChevronRight, Info, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { shiftMonth, throughManager, type Transfer } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, Figure } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupSettlementTabProps {
  data: GroupPageData;
  view: GroupView;
  onRecordPayment: (transfer: Transfer) => void;
  onCloseMonth: () => void;
}

// A mess adds each member's meals and meal cost; a family shows the costs.
const MESS_ROW = "md:grid-cols-[minmax(0,1fr)_56px_92px_92px_96px_100px_92px_80px_150px]";
const FAMILY_ROW = "md:grid-cols-[minmax(0,1fr)_110px_100px_92px_80px_170px]";

type Route = "manager" | "direct";

// The board's month reckoning: who spent what -- meals, meal cost, shared
// cost, what each put in and paid from their pocket -- whether the account
// checks out, the payments that settle it (through the manager or member to
// member), and the months already closed.
export function GroupSettlementTab({ data, view, onRecordPayment, onCloseMonth }: GroupSettlementTabProps) {
  const { t, locale } = useLocale();
  const { currency, settlement, range, settings } = data;
  const month = monthName(range.key, locale);
  const nextMonth = monthName(shiftMonth(range.key, 1), locale);
  const meals = settings.kind === "MESS" || settings.mealsOn;
  const ROW = meals ? MESS_ROW : FAMILY_ROW;
  const holder = settings.cashHolderMemberId ? view.memberById[settings.cashHolderMemberId] : undefined;
  const [route, setRoute] = useState<Route>(holder ? "manager" : "direct");
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const sum = (pick: (row: (typeof settlement.members)[number]) => string) => rows.reduce((total, { row }) => total + Number(pick(row)), 0);
  const totals = { meals: sum((r) => r.mealUnits), mealCost: sum((r) => r.mealCost), shared: sum((r) => r.otherShare), cost: sum((r) => r.share), gross: sum((r) => r.grossDeposited), pocket: sum((r) => r.pocketPaid), returned: sum((r) => r.returned) };
  const sharedEach = settlement.memberCount > 0 ? (Number(settlement.totalExpense) - Number(settlement.mealExpense)) / settlement.memberCount : 0;
  const allEqual = data.expenses.every((expense) => expense.split === "EQUAL" && expense.splits.length === 0);
  const payments = route === "manager" && holder ? throughManager(settlement.members, holder.id) : view.transfers.map((transfer) => ({ ...transfer, owes: false }));
  const managerLeft = holder ? Number(settlement.members.find((r) => r.groupMemberId === holder.id)?.balance ?? 0) : 0;
  const history = [...data.history].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  const money = (value: number | string) => formatCurrency(value, currency);
  const dash = (value: number) => (Math.abs(value) < 0.005 ? <span className="text-ink-muted">—</span> : money(value));

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="flex flex-wrap items-center gap-5 px-5 py-3">
        <Figure label={t("Total expense")} value={money(settlement.totalExpense)} />
        {meals ? (
          <>
            <Figure label={t("Meals")} value={mealText(Number(settlement.mealUnits))} />
            <Figure label={t("Meal rate")} value={money(settlement.mealRate)} tone="text-emerald" />
          </>
        ) : (
          <Figure label={t("Members")} value={String(settlement.memberCount)} />
        )}
        <Figure label={t("Shared cost each")} value={allEqual || meals ? money(sharedEach) : "—"} tone={meals ? "text-ink" : "text-emerald"} />
        <Figure label={t("Cash in hand")} value={money(view.cash)} tone={view.cash < 0 ? "text-expense" : "text-ink"} divided={false} />
        <span className="flex-1" />
        {view.closed ? (
          <span className="flex items-center gap-2 text-small font-semibold text-ink-2">
            <Lock className="size-4" aria-hidden="true" />
            {month} {t("is closed")}
          </span>
        ) : (
          <Button variant="action" onClick={onCloseMonth} disabled={rows.length === 0}>
            <Lock />
            {t("Close")} {month}
          </Button>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="text-title font-semibold text-ink">
            {t("Who spent what")} · {formatDate(range.from, "d")}–{formatDate(range.to, "d MMMM yyyy")}
          </h2>
          <span className="text-small text-ink-muted">
            {meals && `${t("Meal cost = meals × {rate}", { rate: money(settlement.mealRate) })} · `}
            {allEqual || meals ? `${t("shared cost")} = ${money(Number(settlement.totalExpense) - Number(settlement.mealExpense))} ÷ ${settlement.memberCount}` : t("Each cost is shared the way its expense says.")}
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className={meals ? "md:min-w-237" : undefined}>
            <div className={cn("hidden items-end gap-3 border-y border-line bg-table-head px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
              <span>{t("Member")}</span>
              {meals && (
                <>
                  <span className="text-right">{t("Meals")}</span>
                  <span className="text-right">{t("Meal cost")}</span>
                  <span className="text-right">{t("Shared cost")}</span>
                </>
              )}
              <span className="text-right font-semibold text-ink-2">{t("Total cost")}</span>
              <span className="text-right">{t("Contributed")}</span>
              <span className="text-right">{t("Own pocket")}</span>
              <span className="text-right">{t("Returned")}</span>
              <span className="text-right">{t("Balance")}</span>
            </div>
            {rows.length === 0 && <p className="border-t border-line px-5 py-8 text-center text-body text-ink-muted">{t("Add members to see the settlement.")}</p>}
            {rows.map(({ row, member }) => (
              <div key={row.groupMemberId} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-sunken px-5 py-3 text-body tabular-nums md:min-h-13 md:py-0", ROW)}>
                <span className="flex min-w-0 items-center gap-3 font-medium text-ink">
                  <PersonAvatar name={row.name} src={member?.photoUrl} size={30} coloured />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{row.name}</span>
                    <span className="truncate text-caption font-normal text-ink-muted md:hidden">
                      {money(row.contributed)} {t("paid in")} · {money(row.share)} {t("cost")}
                    </span>
                  </span>
                </span>
                {meals && (
                  <>
                    <span className="hidden text-right text-ink-2 md:block">{mealText(Number(row.mealUnits))}</span>
                    <span className="hidden text-right text-ink-2 md:block">{money(row.mealCost)}</span>
                    <span className="hidden text-right text-ink-2 md:block">{money(row.otherShare)}</span>
                  </>
                )}
                <span className="hidden text-right font-semibold text-ink md:block">{money(row.share)}</span>
                <span className="hidden text-right text-ink md:block">{money(row.grossDeposited)}</span>
                <span className={cn("hidden text-right md:block", Number(row.pocketPaid) > 0 ? "text-income" : "text-ink-muted")}>{dash(Number(row.pocketPaid))}</span>
                <span className="hidden text-right text-ink-muted md:block">{dash(Number(row.returned))}</span>
                <BalanceCell value={Number(row.balance)} currency={currency} />
              </div>
            ))}
            {rows.length > 0 && (
              <div className={cn("grid h-12.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-table-head px-5 text-body font-semibold tabular-nums", ROW)}>
                <span>{t("Total")}</span>
                {meals && (
                  <>
                    <span className="hidden text-right md:block">{mealText(totals.meals)}</span>
                    <span className="hidden text-right md:block">{money(totals.mealCost)}</span>
                    <span className="hidden text-right md:block">{money(totals.shared)}</span>
                  </>
                )}
                <span className="hidden text-right md:block">{money(totals.cost)}</span>
                <span className="hidden text-right md:block">{money(totals.gross)}</span>
                <span className="hidden text-right md:block">{money(totals.pocket)}</span>
                <span className="hidden text-right md:block">{money(totals.returned)}</span>
                <span className={cn("text-right", view.cash < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(view.cash, currency)}</span>
              </div>
            )}
          </div>
        </div>
        {rows.length > 0 && (
          <div className={cn("flex items-center gap-3 border-t px-5 py-3 text-small", view.cash < 0 ? "border-expense-soft bg-expense-soft text-expense" : "border-mint-50 bg-mint-50 text-brand-ink")}>
            {view.cash < 0 ? <Info className="size-4 shrink-0" aria-hidden="true" /> : <Check className="size-4 shrink-0" aria-hidden="true" />}
            <span>
              <b className="font-semibold">{view.cash < 0 ? t("More was spent than came in.") : t("The account checks out.")}</b>{" "}
              {t("Balances add up to {cash}, exactly the cash {holder} should hold: {contributed} contributed − {spent} spent from the fund.", {
                cash: formatSignedCurrency(view.cash, currency),
                holder: holder?.name ?? t("the fund"),
                contributed: money(totals.gross - totals.returned),
                spent: money(Number(settlement.totalExpense) - totals.pocket),
              })}
            </span>
          </div>
        )}
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-sunken px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Settle up")}</h2>
            {holder ? (
              <SegmentedControl<Route>
                options={[
                  { value: "manager", label: "Through the manager" },
                  { value: "direct", label: "Member to member" },
                ]}
                value={route}
                onChange={setRoute}
                label="How to settle"
                variant="soft"
              />
            ) : (
              <span className="text-small text-ink-muted">{t("Member to member")}</span>
            )}
          </div>
          {payments.length === 0 && <p className="px-5 py-6 text-center text-small text-ink-muted">{rows.length === 0 ? t("Nothing to settle yet.") : t("Everyone is even. Nothing to settle.")}</p>}
          {payments.map((payment) => {
            const from = view.memberById[payment.fromId];
            const to = view.memberById[payment.toId];
            const note = route === "manager" ? (payment.owes ? "pays the manager" : "returns from the cash") : "pays directly";
            return (
              <div key={`${payment.fromId}-${payment.toId}`} className="flex min-h-13.5 items-center gap-3 border-b border-surface-sunken px-5 py-2 text-body">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <PersonAvatar name={from?.name ?? "?"} src={from?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{from?.name}</span>
                  <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
                  <PersonAvatar name={to?.name ?? "?"} src={to?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{to?.name}</span>
                  <span className="text-caption font-normal text-ink-muted">{t(note)}</span>
                </span>
                <span className="font-bold text-ink tabular-nums">{money(payment.amount)}</span>
                {!view.closed && (
                  <Button variant="secondary" size="sm" onClick={() => onRecordPayment({ fromId: payment.fromId, toId: payment.toId, amount: payment.amount })} className="h-8 px-3">
                    {t("Record")}
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex items-start gap-2 bg-strip px-5 py-3 text-small leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              {payments.length === 0
                ? t("A payment is saved as two entries: a deposit by the payer and a return to the receiver.")
                : route === "manager" && holder
                  ? t("After these payments everyone else is at {zero}, and the {left} left with {holder} is {holder}'s own balance. Or skip them and carry the balances into {month} when you close.", { zero: money(0), left: money(managerLeft), holder: holder.name, month: nextMonth })
                  : t("After these payments everyone is at {zero}. Or skip them and carry the balances into {month} when you close.", { zero: money(0), month: nextMonth })}
            </span>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-sunken px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Closed months")}</h2>
            <span className="text-caption font-normal text-ink-muted">{t("Locked, they never change")}</span>
          </div>
          {history.length === 0 && <p className="px-5 py-6 text-center text-small text-ink-muted">{t("No month closed yet.")}</p>}
          {history.map((record) => {
            const key = record.periodStart.slice(0, 7);
            const people = `${record.memberCount} ${t(record.memberCount === 1 ? "member" : "members")}`;
            return (
              <Link key={record.id} href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: key } }} className="flex items-center gap-3 border-b border-surface-sunken px-5 py-3 text-ink last:border-b-0 hover:bg-cream">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
                  <Lock className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex justify-between gap-3 text-body font-semibold">
                    <span>{monthName(key, locale, "long", true)}</span>
                    <span className="tabular-nums">{money(record.totalExpense)}</span>
                  </span>
                  <span className="text-caption font-normal text-ink-muted">
                    {t("Closed")} {formatDate(record.closedAt, "d MMM yyyy")}
                    {record.carriedForward ? ` · ${t("balances carried forward")}` : ""}
                  </span>
                  <span className="text-caption font-normal text-ink-2 tabular-nums">
                    {Number(record.mealUnits) > 0 ? `${mealText(Number(record.mealUnits))} ${t("meals")} · ${t("{rate} a meal", { rate: money(record.mealRate) })} · ${people}` : `${people} · ${money(record.perMemberShare)} ${t("each")}`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
