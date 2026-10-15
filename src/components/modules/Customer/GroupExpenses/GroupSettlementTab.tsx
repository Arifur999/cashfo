"use client";

import { ArrowRight, Check, ChevronRight, Info, Lock } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { Transfer } from "@/lib/customer/groupDisplay";
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

const ROW = "md:grid-cols-[minmax(0,1fr)_110px_110px_100px_100px_190px]";

// The month's reckoning: who spent what, whether the account checks out,
// the payments that settle it, and the months already closed.
export function GroupSettlementTab({ data, view, onRecordPayment, onCloseMonth }: GroupSettlementTabProps) {
  const { t, locale } = useLocale();
  const { currency, settlement, range } = data;
  const month = monthName(range.key, locale);
  const rows = settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] }));
  const totals = rows.reduce(
    (acc, { row }) => ({ gross: acc.gross + Number(row.grossDeposited), returned: acc.returned + Number(row.returned), contributed: acc.contributed + Number(row.contributed), share: acc.share + Number(row.share) }),
    { gross: 0, returned: 0, contributed: 0, share: 0 },
  );
  const history = [...data.history].sort((a, b) => b.periodStart.localeCompare(a.periodStart));

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="flex flex-wrap items-center gap-5 px-5 py-3">
        <Figure label={t("Total expense")} value={formatCurrency(settlement.totalExpense, currency)} />
        <Figure label={t("Members")} value={String(settlement.memberCount)} />
        <Figure label={t("Share each")} value={formatCurrency(settlement.perMemberShare, currency)} tone="text-emerald" />
        <Figure label={t("Contributed")} value={formatCurrency(totals.contributed, currency)} />
        <Figure label={t("Cash in hand")} value={formatCurrency(view.cash, currency)} tone={view.cash < 0 ? "text-expense" : "text-ink"} divided={false} />
        <span className="flex-1" />
        {view.closed ? (
          <span className="flex items-center gap-2 text-small font-semibold text-ink-2">
            <Lock className="size-4" aria-hidden="true" />
            {month} {t("is closed")}
          </span>
        ) : (
          <Button onClick={onCloseMonth} disabled={rows.length === 0}>
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
            {t("shared cost")} = {formatCurrency(settlement.totalExpense, currency)} ÷ {settlement.memberCount}
          </span>
        </div>
        <div className={cn("hidden items-center gap-3 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
          <span>{t("Member")}</span>
          <span className="text-right">{t("Deposited")}</span>
          <span className="text-right">{t("Returned")}</span>
          <span className="text-right">{t("Paid in")}</span>
          <span className="text-right font-semibold text-ink-2">{t("Cost")}</span>
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
                  {formatCurrency(row.contributed, currency)} {t("paid in")} · {formatCurrency(row.share, currency)} {t("cost")}
                </span>
              </span>
            </span>
            <span className="hidden text-right text-ink-2 md:block">{formatCurrency(row.grossDeposited, currency)}</span>
            <span className={cn("hidden text-right md:block", Number(row.returned) > 0 ? "text-ink-2" : "text-ink-muted")}>{Number(row.returned) > 0 ? formatCurrency(row.returned, currency) : "—"}</span>
            <span className="hidden text-right text-ink md:block">{formatCurrency(row.contributed, currency)}</span>
            <span className="hidden text-right font-semibold text-ink md:block">{formatCurrency(row.share, currency)}</span>
            <BalanceCell value={Number(row.balance)} currency={currency} />
          </div>
        ))}
        {rows.length > 0 && (
          <>
            <div className={cn("grid h-12.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-cream px-5 text-body font-semibold tabular-nums", ROW)}>
              <span>{t("Total")}</span>
              <span className="hidden text-right md:block">{formatCurrency(totals.gross, currency)}</span>
              <span className="hidden text-right md:block">{formatCurrency(totals.returned, currency)}</span>
              <span className="hidden text-right md:block">{formatCurrency(totals.contributed, currency)}</span>
              <span className="hidden text-right md:block">{formatCurrency(totals.share, currency)}</span>
              <span className={cn("text-right", view.cash < 0 ? "text-expense" : "text-income")}>{formatSignedCurrency(view.cash, currency)}</span>
            </div>
            <div className={cn("flex items-center gap-3 px-5 py-3 text-small", view.cash < 0 ? "bg-expense-soft text-expense" : "bg-mint-50 text-brand-ink")}>
              {view.cash < 0 ? <Info className="size-4 shrink-0" aria-hidden="true" /> : <Check className="size-4 shrink-0" aria-hidden="true" />}
              <span>
                <b className="font-semibold">{view.cash < 0 ? t("More was spent than came in.") : t("The account checks out.")}</b> {t("Balances add up to")} {formatSignedCurrency(view.cash, currency)}, {t("exactly the cash the fund should hold")}: {formatCurrency(totals.contributed, currency)} {t("contributed")} − {formatCurrency(settlement.totalExpense, currency)} {t("spent")}.
              </span>
            </div>
          </>
        )}
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-surface-sunken px-5 py-4">
            <h2 className="text-title font-semibold text-ink">{t("Settle up")}</h2>
            <span className="text-small text-ink-muted">{t("Member to member")}</span>
          </div>
          {view.transfers.length === 0 && <p className="px-5 py-6 text-center text-small text-ink-muted">{rows.length === 0 ? t("Nothing to settle yet.") : t("Everyone is even. Nothing to settle.")}</p>}
          {view.transfers.map((transfer) => {
            const from = view.memberById[transfer.fromId];
            const to = view.memberById[transfer.toId];
            return (
              <div key={`${transfer.fromId}-${transfer.toId}`} className="flex min-h-13.5 items-center gap-3 border-b border-surface-sunken px-5 py-2 text-body">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <PersonAvatar name={from?.name ?? "?"} src={from?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{from?.name}</span>
                  <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
                  <PersonAvatar name={to?.name ?? "?"} src={to?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{to?.name}</span>
                  <span className="text-caption font-normal text-ink-muted">{t("pays directly")}</span>
                </span>
                <span className="font-bold text-ink tabular-nums">{formatCurrency(transfer.amount, currency)}</span>
                {!view.closed && (
                  <Button variant="secondary" size="sm" onClick={() => onRecordPayment(transfer)} className="h-8 px-3">
                    {t("Record")}
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex items-start gap-2 bg-cream px-5 py-3 text-small leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>{view.transfers.length > 0 ? `${t("After")} ${view.transfers.length === 1 ? t("this payment") : `${t("these")} ${view.transfers.length} ${t("payments")}`} ${t("everyone is at")} ${formatCurrency(0, currency)}. ${t("Or skip them and carry the balances into next month when you close.")}` : t("A payment is saved as two entries: a deposit by the payer and a return to the receiver.")}</span>
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
            return (
              <Link key={record.id} href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: key } }} className="flex items-center gap-3 border-b border-surface-sunken px-5 py-3 text-ink last:border-b-0 hover:bg-cream">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
                  <Lock className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex justify-between gap-3 text-body font-semibold">
                    <span>{monthName(key, locale, "long", true)}</span>
                    <span className="tabular-nums">{formatCurrency(record.totalExpense, currency)}</span>
                  </span>
                  <span className="text-caption font-normal text-ink-2 tabular-nums">
                    {record.memberCount} {t(record.memberCount === 1 ? "member" : "members")} · {formatCurrency(record.perMemberShare, currency)} {t("each")}
                  </span>
                  <span className="text-caption font-normal text-ink-muted">
                    {t("Closed")} {formatDate(record.closedAt, "d MMM yyyy")}
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
