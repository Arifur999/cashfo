"use client";

import { ArrowDownToLine, ChevronDown, CircleCheck, Clock, Copy, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import EmptyState from "@/components/smartly/EmptyState";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { formatCurrency } from "@/lib/customer/currency";
import { cancelWithdrawalAction, listWithdrawalsAction } from "@/lib/customer/referralActions";
import { balancesOf, dayOf, destinationLine, friendDay, PAYOUT_STATUS, programOf } from "@/lib/customer/referralDisplay";
import type { PayoutRequest, ReferralProgramInfo, WithdrawalList } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { WITHDRAW_ROUTE } from "./EarningsHero";
import { MethodTile, StatusChip, useCopy } from "./ReferralBits";

export const PROFILE_ROUTE = "/referrals/profile";

interface WithdrawalsClientProps {
  info: ReferralProgramInfo | null;
  withdrawals: WithdrawalList | null;
  currency: string;
  today: string;
  pageSize: number;
}

// Request | Date | Amount | To | Status
const COLUMNS = "md:grid-cols-[84px_100px_96px_minmax(0,1fr)_130px]";

// The note under each request: its colours and icon.
const NOTE_LOOK: Record<PayoutRequest["status"], { className: string; icon: typeof Clock }> = {
  REQUESTED: { className: "bg-warning-50 text-warning-ink", icon: Clock },
  APPROVED: { className: "bg-info-50 text-info-ink", icon: CircleCheck },
  PAID: { className: "bg-emerald-soft text-brand-ink", icon: CircleCheck },
  REJECTED: { className: "bg-expense-soft/60 text-expense", icon: Undo2 },
  CANCELLED: { className: "bg-strip text-ink-soft", icon: X },
};

// Referrals > Withdrawals (WithdrawalsHistory): every request with what
// happened to it and the friend payments it is made of (open ones show
// them; the others on a tap), Cancel while it waits, the TrxID to copy once
// paid; and how a withdrawal works beside it.
export function WithdrawalsClient({ info, withdrawals, currency, today, pageSize }: WithdrawalsClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const copy = useCopy();
  const [list, setList] = useState(withdrawals);
  const [loading, startLoad] = useTransition();
  const [cancelling, setCancelling] = useState<PayoutRequest | null>(null);
  const [isCancelling, startCancel] = useTransition();
  // Open requests show their lines; a tap shows or hides any request's.
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const day = (at: string | null) => friendDay(dayOf(at), today, fmt);
  const program = info ? programOf(info) : null;
  const available = info ? balancesOf(info).available : 0;

  // The server's newer read wins (after a refresh).
  const [seen, setSeen] = useState(withdrawals);
  if (seen !== withdrawals) {
    setSeen(withdrawals);
    setList(withdrawals);
  }

  function goTo(page: number) {
    startLoad(async () => {
      const result = await listWithdrawalsAction(page, pageSize).catch(() => null);
      if (result?.success && result.data) setList(result.data);
      else toast.error(t(result?.message ?? "Couldn't load your withdrawals."));
    });
  }

  function cancel() {
    const request = cancelling;
    if (!request) return;
    startCancel(async () => {
      const result = await cancelWithdrawalAction(request.id).catch(() => null);
      if (result?.success && result.data) {
        const updated = result.data;
        setList((current) => current && { ...current, data: current.data.map((row) => (row.id === updated.id ? updated : row)) });
        toast.success(t("Request cancelled. {amount} is back in your balance.", { amount: money(request.amount) }));
      } else toast.error(t(result?.message ?? "Couldn't cancel the request."));
      setCancelling(null);
      router.refresh();
    });
  }

  const open = (request: PayoutRequest) => (request.status === "REQUESTED" || request.status === "APPROVED") !== toggled.has(request.id);
  const toggle = (id: string) =>
    setToggled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // What happened to a request, in a sentence.
  function noteOf(request: PayoutRequest): string {
    const expected = formatDate(`${request.expectedBy}T06:00:00Z`, "EEE, d MMM", request.expectedBy, fmt);
    const held = request.lines.filter((line) => line.status === "UNDER_CHECK").length;
    switch (request.status) {
      case "REQUESTED":
        return t("We are checking that each friend's payment reached us. Expected by {date}.", { date: expected });
      case "APPROVED":
        return held > 0
          ? t("Approved on {date} without {count} payments we are still checking. Expected by {expected}.", { date: day(request.approvedAt), count: formatCount(held, fmt), expected })
          : t("Approved on {date}. Expected by {expected}.", { date: day(request.approvedAt), expected });
      case "PAID": {
        const parts = [t("Paid on {date}", { date: day(request.paidAt) })];
        if (request.trxId) parts.push(t("TrxID {id}", { id: request.trxId }));
        if (request.paidAmount && Number(request.paidAmount) !== Number(request.receiveAmount)) parts.push(t("{amount} sent", { amount: money(request.paidAmount) }));
        if (request.income?.transactionId && request.income.accountName) parts.push(t("added as income to {wallet}", { wallet: request.income.accountName }));
        return parts.join(" · ");
      }
      case "REJECTED":
        return request.rejectReason
          ? t("Rejected: {reason}. The money is back in your balance.", { reason: request.rejectReason.replace(/[.\s]+$/, "") })
          : t("Rejected on {date}. The money is back in your balance.", { date: day(request.rejectedAt) });
      case "CANCELLED":
        return t("You cancelled it on {date}. The money is back in your balance.", { date: day(request.cancelledAt) });
    }
  }

  const rows = list?.data ?? [];
  const steps = program
    ? [
        { title: t("You ask"), body: t("Pick the payments you want to withdraw, from {min}.", { min: money(program.minWithdrawal) }) },
        { title: t("We check"), body: t("Our team matches each friend's payment with what reached us.") },
        { title: t("We send"), body: t("To your bKash, Nagad, Rocket or bank, usually within {days} working days.", { days: formatCount(program.payWithinDays, fmt) }) },
        { title: t("You get proof"), body: t("The transaction ID shows here and comes by email.") },
      ]
    : [];

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("Withdrawals")} />
      <PageHeader
        title={t("Withdrawals")}
        description={t("Your requests, the payments each one covers, and where the money went.")}
        hideDescriptionOnPhone
        className="max-md:[&_h1]:sr-only"
        actions={
          <Link href={WITHDRAW_ROUTE} className="flex h-10 items-center gap-2 rounded-full bg-emerald px-4 text-body font-semibold text-on-action shadow-button hover:bg-emerald-hover">
            <ArrowDownToLine className="size-4" strokeWidth={2.25} aria-hidden="true" />
            {t("Withdraw {amount}", { amount: money(available) })}
          </Link>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="overflow-clip" role="region" aria-labelledby="wh-title">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3.5 md:px-5">
            <h2 id="wh-title" className="flex-1 text-title text-ink">
              {t("Your requests")}
            </h2>
            {list && (
              <>
                <span className="text-[13px] text-ink-muted">
                  {t("Being checked")} <b className="font-bold text-warning tabular-nums">{money(list.totals.askedFor)}</b>
                </span>
                <span className="text-[13px] text-ink-muted">
                  {t("Paid to you")} <b className="font-bold text-emerald tabular-nums">{money(list.totals.received)}</b>
                </span>
              </>
            )}
          </div>
          {!list ? (
            <ErrorState title={t("Couldn't load your withdrawals.")} onRetry={() => router.refresh()} />
          ) : rows.length === 0 ? (
            <EmptyState bordered={false} icon={<ArrowDownToLine />} title={t("No withdrawals yet")} description={t("When you withdraw, each request shows here with what happened to it.")} />
          ) : (
            <div role="table" aria-label={t("Withdrawals")} aria-busy={loading || undefined}>
              <div role="row" className={cn("hidden items-center gap-x-3.5 border-y border-line bg-table-head px-5 py-2.25 text-caption leading-normal font-medium text-ink-muted md:grid", COLUMNS)}>
                <span role="columnheader">{t("Request")}</span>
                <span role="columnheader">{t("Date")}</span>
                <span role="columnheader" className="text-right">
                  {t("Amount")}
                </span>
                <span role="columnheader">{t("To@@payout")}</span>
                <span role="columnheader">{t("Status")}</span>
              </div>
              {rows.map((request) => {
                const status = PAYOUT_STATUS[request.status];
                const look = NOTE_LOOK[request.status];
                const Icon = look.icon;
                const expanded = open(request);
                const struck = request.status === "REJECTED" || request.status === "CANCELLED";
                const linesId = `wd-lines-${request.id}`;
                return (
                  <div key={request.id} role="row" className={cn("flex flex-col gap-2.5 border-t border-divider px-4 py-3.5 first:border-t-0 md:border-t-0 md:border-b md:px-5 md:last:border-b-0", request.status === "REQUESTED" && "bg-warning-50/40")}>
                    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 text-body tabular-nums", COLUMNS)}>
                      <span role="cell" className="font-mono text-[13px] text-ink-2 max-md:order-1">
                        {request.displayId}
                      </span>
                      <span role="cell" className="text-ink-soft max-md:order-3 max-md:text-caption">
                        {formatDate(request.createdAt, "d MMM yyyy", "", fmt)}
                      </span>
                      <span role="cell" className={cn("text-right font-bold max-md:order-2", struck ? "text-ink-muted line-through" : "text-ink")}>
                        {money(request.amount)}
                        {Number(request.requestedAmount) !== Number(request.amount) && <span className="block text-caption font-normal text-ink-muted no-underline">{t("of {amount}", { amount: money(request.requestedAmount) })}</span>}
                      </span>
                      <span role="cell" className="flex min-w-0 items-center gap-2 max-md:order-5 max-md:col-span-2">
                        <MethodTile method={request.method} size="chip" />
                        <span className="truncate">{destinationLine(request.method)}</span>
                      </span>
                      <span role="cell" className="max-md:order-4 max-md:justify-self-end">
                        <StatusChip tone={status.tone} size="md">
                          {t(status.label)}
                        </StatusChip>
                      </span>
                    </div>
                    <div role="cell" className={cn("flex flex-wrap items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] leading-[1.45] md:flex-nowrap", look.className)}>
                      <Icon className="size-3.75 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 break-words">{noteOf(request)}</span>
                      {request.lines.length > 0 && (
                        <button type="button" aria-expanded={expanded} aria-controls={linesId} onClick={() => toggle(request.id)} className="flex h-7.5 shrink-0 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
                          {expanded ? t("Hide payments") : t(request.lines.length === 1 ? "{count} payment" : "{count} payments", { count: formatCount(request.lines.length, fmt) })}
                          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                        </button>
                      )}
                      {request.canCancel && (
                        <button type="button" onClick={() => setCancelling(request)} className="h-7.5 shrink-0 rounded-full border border-expense-line bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-expense hover:bg-expense-soft">
                          {t("Cancel")}
                        </button>
                      )}
                      {request.status === "PAID" && request.trxId && (
                        <button
                          type="button"
                          onClick={() => copy(request.trxId as string, t("Transaction ID copied"))}
                          className="flex h-7.5 shrink-0 items-center gap-1.5 rounded-full border border-emerald-line bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-emerald hover:bg-emerald-soft"
                        >
                          <Copy className="size-3.25" aria-hidden="true" />
                          {t("Copy TrxID")}
                        </button>
                      )}
                    </div>
                    {expanded && request.lines.length > 0 && (
                      <div id={linesId} className="overflow-hidden rounded-lg border border-line bg-surface">
                        <ul>
                          {request.lines.map((line) => (
                            <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-divider px-3.5 py-2 text-[13px] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_90px]">
                              <span className="truncate font-semibold text-ink">{line.friendName}</span>
                              <span className="truncate text-ink-muted max-sm:order-3">{[line.planName, formatDate(line.paidAt, "d MMM", "", fmt)].filter(Boolean).join(" · ")}</span>
                              <span className="text-right text-ink-muted tabular-nums max-sm:hidden">{Number(line.paidAmount) > 0 ? money(line.paidAmount) : "—"}</span>
                              <span className="text-right font-bold text-ink tabular-nums">
                                {money(line.amount)}
                                {line.status === "UNDER_CHECK" && <span className="block text-caption font-semibold text-orange">{t("Under check")}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between gap-3 border-t border-line bg-strip px-3.5 py-2 text-caption text-ink-muted">
                          <span>{t("We check that each of these payments reached us before we pay you.")}</span>
                          <b className="text-[13px] font-bold text-ink tabular-nums">{money(request.requestedAmount)}</b>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {list && list.meta.totalPages > 1 && (
            <div className="border-t border-divider px-4 py-3 md:px-5">
              <Pagination page={list.meta.page} totalPages={list.meta.totalPages} total={list.meta.total} pageSize={list.meta.limit} onPageChange={goTo} />
            </div>
          )}
        </Card>

        <Card padding="none" className="flex flex-col gap-4 p-4.5 md:p-5" role="region" aria-labelledby="hw-title">
          <h2 id="hw-title" className="text-title text-ink">
            {t("How a withdrawal works")}
          </h2>
          <ol className="flex flex-col gap-3.5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span aria-hidden="true" className="flex size-6.5 shrink-0 items-center justify-center rounded-full border border-line bg-strip text-caption font-semibold text-ink-soft">
                  {formatCount(index + 1, fmt)}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink">{step.title}</span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href={PROFILE_ROUTE} className="flex h-10.5 items-center justify-center rounded-full border border-line-strong bg-surface text-[13.5px] font-semibold text-ink hover:bg-surface-sunken">
            {t("Manage payout accounts")}
          </Link>
        </Card>
      </div>

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
        isPending={isCancelling}
        icon={<X />}
        title={t("Cancel this request?")}
        description={cancelling ? t("{id} for {amount}. The payments go back to your balance and you can ask again.", { id: cancelling.displayId, amount: money(cancelling.amount) }) : ""}
        confirmLabel={t("Cancel request")}
        cancelLabel={t("Keep it")}
      />
    </PageFrame>
  );
}
