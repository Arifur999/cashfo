"use client";

import { ArrowDownToLine, CircleCheck, Clock, Copy, Pencil, Plus, TriangleAlert, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import EmptyState from "@/components/smartly/EmptyState";
import ErrorState from "@/components/smartly/ErrorState";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Pagination from "@/components/smartly/Pagination";
import { formatCurrency } from "@/lib/customer/currency";
import { cancelWithdrawalAction, listWithdrawalsAction } from "@/lib/customer/referralActions";
import { dayOf, destinationLine, formatWalletNumber, friendDay, maskAccount, METHOD_BRANDS, PAYOUT_STATUS } from "@/lib/customer/referralDisplay";
import type { PayoutMethod, PayoutMethodType, PayoutRequest, WithdrawalList } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PayoutMethodDrawer } from "./PayoutMethodDrawer";
import { MethodTile, StatusChip, useCopy } from "./ReferralBits";

interface WithdrawalsTabProps {
  withdrawals: WithdrawalList | null;
  methods: PayoutMethod[];
  currency: string;
  today: string;
  userName: string;
  allowed: PayoutMethodType[];
  pageSize: number;
}

// Request | Date | Amount | To | Status (WithdrawalsHistory).
const COLUMNS = "md:grid-cols-[92px_100px_96px_minmax(0,1fr)_128px]";

// The note under each request: its words, colours and icon.
const NOTE_LOOK: Record<PayoutRequest["status"], { className: string; icon: typeof Clock }> = {
  REQUESTED: { className: "bg-warning-50 text-warning-ink", icon: Clock },
  APPROVED: { className: "bg-info-50 text-info-ink", icon: CircleCheck },
  PAID: { className: "bg-emerald-soft text-brand-ink", icon: CircleCheck },
  REJECTED: { className: "bg-expense-soft/60 text-expense", icon: Undo2 },
  CANCELLED: { className: "bg-strip text-ink-soft", icon: X },
};

// A saved method's name ("bKash · Personal", "Dutch-Bangla Bank") and line
// ("01711-482915 · Khaled Mahmud", "Savings •••• 4417 · Mirpur").
export function useMethodWords() {
  const { t } = useLocale();
  return {
    title: (method: PayoutMethod) => (method.type === "BANK" ? (method.bankName ?? t("Bank")) : `${METHOD_BRANDS[method.type].name} · ${t("Personal@@wallet")}`),
    detail: (method: PayoutMethod, { withName = false, withBranch = false } = {}) =>
      method.type === "BANK"
        ? [`${t(method.bankAccountType === "CURRENT" ? "Current@@account" : "Savings@@account")} ${maskAccount(method.accountNumber)}`, withName ? method.accountName : null, method.branch ? (withBranch ? t("{branch} branch", { branch: method.branch }) : method.branch) : null].filter(Boolean).join(" · ")
        : `${formatWalletNumber(method.walletNumber)} · ${method.accountName}`,
  };
}

// The Withdrawals tab: every request with its status and what happened
// (waiting, with Cancel; paid, with the transaction ID to copy; rejected,
// with why and the money back), and the saved payout methods beside it,
// each one to edit, with Add another.
export function WithdrawalsTab({ withdrawals, methods: initialMethods, currency, today, userName, allowed, pageSize }: WithdrawalsTabProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const copy = useCopy();
  const words = useMethodWords();
  const [list, setList] = useState(withdrawals);
  const [methods, setMethods] = useState(initialMethods);
  const [loading, startLoad] = useTransition();
  const [cancelling, setCancelling] = useState<PayoutRequest | null>(null);
  const [isCancelling, startCancel] = useTransition();
  const [drawer, setDrawer] = useState<{ open: boolean; method: PayoutMethod | null }>({ open: false, method: null });
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const day = (at: string | null) => friendDay(dayOf(at), today, fmt);

  // The server's newer read wins (after a refresh).
  const [seen, setSeen] = useState({ withdrawals, initialMethods });
  if (seen.withdrawals !== withdrawals || seen.initialMethods !== initialMethods) {
    setSeen({ withdrawals, initialMethods });
    setList(withdrawals);
    setMethods(initialMethods);
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
        setCancelling(null);
        toast.success(t("Request cancelled. {amount} is back in your balance.", { amount: money(request.amount) }));
        router.refresh();
      } else {
        toast.error(t(result?.message ?? "Couldn't cancel the request."));
        setCancelling(null);
        router.refresh();
      }
    });
  }

  // What happened to a request, in a sentence.
  function noteOf(request: PayoutRequest): string {
    const expected = formatDate(`${request.expectedBy}T06:00:00Z`, "EEE, d MMM", request.expectedBy, fmt);
    switch (request.status) {
      case "REQUESTED":
        return t("Waiting for approval. Expected by {date}.", { date: expected });
      case "APPROVED":
        return t("Approved on {date}. Expected by {expected}.", { date: day(request.approvedAt), expected });
      case "PAID": {
        const parts = [t("Paid on {date}", { date: day(request.paidAt) })];
        if (request.trxId) parts.push(t("{service} TrxID {id}", { service: request.method.type === "BANK" ? t("Bank") : METHOD_BRANDS[request.method.type].name, id: request.trxId }));
        if (request.paidAmount && Number(request.paidAmount) !== Number(request.receiveAmount)) parts.push(t("{amount} sent", { amount: money(request.paidAmount) }));
        if (request.income?.transactionId && request.income.accountName) parts.push(t("added as income to {wallet}", { wallet: request.income.accountName }));
        return parts.join(" · ");
      }
      case "REJECTED":
        return request.rejectReason
          ? t("Rejected on {date}: {reason}. {amount} went back to your balance.", { date: day(request.rejectedAt), reason: request.rejectReason.replace(/[.\s]+$/, ""), amount: money(request.amount) })
          : t("Rejected on {date}. {amount} went back to your balance.", { date: day(request.rejectedAt), amount: money(request.amount) });
      case "CANCELLED":
        return t("You cancelled it on {date}. {amount} went back to your balance.", { date: day(request.cancelledAt), amount: money(request.amount) });
    }
  }

  // The line a saved method warns with.
  function warningOf(method: PayoutMethod): string | null {
    if (method.lastRejection) return method.lastRejection.reason ? t("The last withdrawal here was rejected: {reason}. Check it before using this account.", { reason: method.lastRejection.reason.replace(/[.\s]+$/, "") }) : t("The last withdrawal here was rejected. Check it before using this account.");
    if (!method.nameMatches) return t("The name on this account isn't {name}. The payment may be rejected.", { name: userName });
    return null;
  }

  function saved(method: PayoutMethod | null) {
    setDrawer({ open: false, method: null });
    router.refresh();
    if (!method) return;
    setMethods((current) => {
      const others = current.filter((row) => row.id !== method.id).map((row) => (method.isDefault ? { ...row, isDefault: false } : row));
      return [...others, method].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt));
    });
  }

  const rows = list?.data ?? [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card padding="none" className="overflow-clip" role="region" aria-labelledby="wh-title">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3.5 md:px-5">
          <h2 id="wh-title" className="flex-1 text-title text-ink">
            {t("Withdrawals")}
          </h2>
          {list && (
            <>
              <span className="text-[13px] text-ink-muted">
                {t("Asked for")} <b className="font-bold text-ink tabular-nums">{money(list.totals.askedFor)}</b>
              </span>
              <span className="text-[13px] text-ink-muted">
                {t("Paid out@@referral")} <b className="font-bold text-emerald tabular-nums">{money(list.totals.paidOut)}</b>
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
              return (
                <div key={request.id} role="row" className="flex flex-col gap-2.5 border-t border-divider px-4 py-3.5 first:border-t-0 md:border-t-0 md:border-b md:px-5 md:last:border-b-0">
                  <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 text-body tabular-nums", COLUMNS)}>
                    <span role="cell" className="font-mono text-[13px] text-ink-2 max-md:order-1">
                      {request.displayId}
                    </span>
                    <span role="cell" className="text-ink-soft max-md:order-3 max-md:text-caption">
                      {formatDate(request.createdAt, "d MMM yyyy", "", fmt)}
                    </span>
                    <span role="cell" className="text-right font-bold text-ink max-md:order-2">
                      {money(request.amount)}
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
                  <div role="cell" className={cn("flex flex-wrap items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] leading-[1.45] md:ml-26.5 md:flex-nowrap", look.className)}>
                    <Icon className="size-3.75 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-words">{noteOf(request)}</span>
                    {request.canCancel && (
                      <button type="button" onClick={() => setCancelling(request)} className="h-7.5 shrink-0 rounded-full border border-expense-line bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-expense hover:bg-expense-soft">
                        {t("Cancel request")}
                      </button>
                    )}
                    {request.status === "PAID" && request.trxId && (
                      <button type="button" onClick={() => copy(request.trxId as string, t("Transaction ID copied"))} className="flex h-7.5 shrink-0 items-center gap-1.5 rounded-full border border-emerald-line bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-emerald hover:bg-emerald-soft">
                        <Copy className="size-3.25" aria-hidden="true" />
                        {t("Copy TrxID")}
                      </button>
                    )}
                  </div>
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

      <Card padding="none" className="overflow-clip" role="region" aria-labelledby="wm-title">
        <div className="flex flex-col gap-0.5 px-4.5 pt-4 pb-3">
          <h2 id="wm-title" className="text-title text-ink">
            {t("Where you receive money")}
          </h2>
          <span className="text-[12.5px] text-ink-muted">{t("Saved for your next withdrawal")}</span>
        </div>
        {methods.map((method) => {
          const warning = warningOf(method);
          const title = words.title(method);
          return (
            <div key={method.id} className="flex flex-col gap-2 border-t border-divider px-4.5 py-3">
              <div className="flex items-center gap-3">
                <MethodTile method={method} size="md" />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="flex min-w-0 items-center gap-1.5 text-body font-semibold text-ink">
                    <span className="truncate">{title}</span>
                    {method.isDefault && <span className="shrink-0 rounded-full bg-surface-sunken px-1.75 py-px text-[11px] font-semibold text-ink-soft">{t("Default")}</span>}
                  </span>
                  <span className="truncate text-[12.5px] text-ink-muted tabular-nums">{words.detail(method)}</span>
                </span>
                <button type="button" onClick={() => setDrawer({ open: true, method })} aria-label={t("Edit {name}", { name: title })} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  <Pencil className="size-3.75" aria-hidden="true" />
                </button>
              </div>
              {warning && (
                <span className="flex gap-1.5 rounded-lg bg-warning-50 px-2.5 py-2 text-caption leading-[1.45] text-warning-ink">
                  <TriangleAlert className="mt-px size-3.25 shrink-0 text-warning" aria-hidden="true" />
                  {warning}
                </span>
              )}
            </div>
          );
        })}
        {methods.length === 0 && <p className="border-t border-divider px-4.5 py-3 text-small text-ink-muted">{t("No account saved yet. Add bKash, Nagad, Rocket or a bank account.")}</p>}
        <div className="border-t border-divider px-4.5 pt-3 pb-4">
          <button type="button" onClick={() => setDrawer({ open: true, method: null })} className="flex h-10.5 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-input bg-surface text-[13.5px] font-semibold text-emerald hover:border-emerald">
            <Plus className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            {methods.length === 0 ? t("Add an account") : t("Add another")}
          </button>
        </div>
      </Card>

      <PayoutMethodDrawer open={drawer.open} method={drawer.method} userName={userName} allowed={allowed} isFirst={methods.length === 0} onClose={() => setDrawer({ open: false, method: null })} onSaved={saved} />
      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
        isPending={isCancelling}
        icon={<X />}
        title={t("Cancel this request?")}
        description={cancelling ? t("{id} for {amount}. The money goes back to your balance.", { id: cancelling.displayId, amount: money(cancelling.amount) }) : ""}
        confirmLabel={t("Cancel request")}
        cancelLabel={t("Keep it")}
      />
    </div>
  );
}

