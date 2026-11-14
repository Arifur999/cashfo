"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { formatCurrency } from "@/lib/customer/currency";
import { cancelWithdrawalAction } from "@/lib/customer/referralActions";
import { dayOf, friendDay, maskAccount, maskWallet, METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import type { PayoutRequest } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WithdrawSubmittedProps {
  request: PayoutRequest;
  // What is left to withdraw after it, and what is still pending.
  left: number;
  pending: number;
  pendingNextAt: string | null;
  // The wallet the money is booked into when paid, by name.
  incomeWallet: string | null;
  currency: string;
  today: string;
}

export const WITHDRAWALS_TAB = "/referrals/withdrawals";

// Withdrawal requested (WithdrawSubmitted): where the money goes and the
// request's number, the three steps it goes through (with the day it
// should be paid by), what is left, and the way to cancel it while nobody
// has approved it.
export function WithdrawSubmitted({ request, left, pending, pendingNextAt, incomeWallet, currency, today }: WithdrawSubmittedProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isCancelling, startCancel] = useTransition();
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const method = request.method;
  const service = method.type === "BANK" ? (method.bankName ?? t("Bank")) : METHOD_BRANDS[method.type].name;
  const number = method.type === "BANK" ? maskAccount(method.accountNumber) : maskWallet(method.walletNumber);
  const expected = formatDate(`${request.expectedBy}T06:00:00Z`, "EEE, d MMM", request.expectedBy, fmt);
  const pendingDay = dayOf(pendingNextAt);

  const steps = [
    { title: t("Requested@@payout"), body: t("{when}. You can still cancel.", { when: formatDate(request.createdAt, "EEE, d MMM · h:mm aaa", "", fmt) }), done: true },
    { title: t("Approved@@payout"), body: t("We check the request, usually within 1 working day."), done: false },
    { title: t("Paid@@payout"), body: t("By {date}. You get the {service} transaction ID here and by email.", { date: expected, service }), done: false },
  ];

  function cancel() {
    startCancel(async () => {
      const result = await cancelWithdrawalAction(request.id).catch(() => null);
      setConfirming(false);
      if (result?.success) {
        toast.success(t("Request cancelled. {amount} is back in your balance.", { amount: money(request.amount) }));
        router.push(WITHDRAWALS_TAB);
      } else toast.error(t(result?.message ?? "Couldn't cancel the request."));
    });
  }

  return (
    <div className="flex justify-center md:pt-4">
      <section aria-labelledby="ws-title" className="w-full max-w-155 overflow-hidden rounded-card border border-line-card bg-surface shadow-[0_4px_16px_rgba(18,32,29,0.06)]">
        <div className="flex flex-col items-center gap-2.5 border-b border-divider px-5 pt-7.5 pb-5.5 text-center md:px-8">
          <span aria-hidden="true" className="flex size-15 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <Check className="size-7.5" strokeWidth={2.5} />
          </span>
          <h1 id="ws-title" className="text-[22px] leading-[normal] font-semibold text-ink">
            {t("Withdrawal requested")}
          </h1>
          <p className="text-[15px] leading-[1.55] text-ink-soft">
            {fillNodes(t("{amount} to {service} {number} ({name})"), {
              amount: <b className="font-bold text-ink tabular-nums">{money(request.amount)}</b>,
              service,
              number: <b className="font-bold text-ink">{number}</b>,
              name: method.accountName,
            })}
          </p>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-0.75 text-[12.5px] text-ink-soft">
            {t("Request")} <b className="font-mono font-bold text-ink">{request.displayId}</b>
          </span>
        </div>

        <ol className="flex flex-col px-5 pt-5.5 pb-2 md:px-8">
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5">
              <span className="flex flex-col items-center">
                <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", step.done ? "bg-emerald text-on-action" : "border-2 border-input bg-surface")}>
                  {step.done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {index < steps.length - 1 && <span aria-hidden="true" className={cn("min-h-6.5 w-0.5 flex-1", step.done ? "bg-emerald-tint" : "bg-line")} />}
              </span>
              <span className="flex flex-col gap-0.5 pb-4.5">
                <span className={cn("text-[15px] leading-[normal] font-semibold", step.done ? "text-ink" : "text-ink-soft")}>
                  {step.title}
                  <span className="sr-only">{step.done ? `, ${t("done")}` : `, ${t("next")}`}</span>
                </span>
                <span className="text-[13px] leading-[normal] text-ink-muted">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mx-5 flex flex-col gap-2.5 rounded-[14px] bg-strip px-4 py-3.5 text-[13.5px] tabular-nums md:mx-8">
          <div className="flex justify-between gap-3">
            <span className="text-ink-soft">{t("Left to withdraw")}</span>
            <b className="font-bold text-ink">{money(left)}</b>
          </div>
          {pending > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-ink-soft">{pendingDay ? t("On hold (ready on {date})", { date: friendDay(pendingDay, today, fmt) }) : t("On hold")}</span>
              <b className="font-bold text-ink">{money(pending)}</b>
            </div>
          )}
          {incomeWallet && (
            <div className="flex gap-2 border-t border-line pt-2.5 text-[13px] leading-[normal] text-ink-soft">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
              <span>{t("When it's paid, {amount} is added as Referral income to your {wallet} wallet.", { amount: money(request.amount), wallet: incomeWallet })}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 px-5 pt-5 pb-6 md:px-8">
          {request.canCancel && (
            <button type="button" onClick={() => setConfirming(true)} disabled={isCancelling} className="flex h-10 items-center gap-2 rounded-full px-3 text-body font-semibold text-expense hover:bg-expense-soft max-sm:order-3 max-sm:w-full max-sm:justify-center">
              {isCancelling && <Loader size={14} label={t("Loading...")} />}
              {t("Cancel request")}
            </button>
          )}
          <span className="flex-1 max-sm:hidden" />
          <Link href="/referrals" className="flex h-10 items-center justify-center rounded-full border border-input bg-surface px-3.5 text-body font-semibold text-ink hover:bg-surface-sunken max-sm:flex-1">
            {t("Back to dashboard")}
          </Link>
          <Link href={WITHDRAWALS_TAB} className="flex h-10 items-center justify-center rounded-full bg-emerald px-4 text-body font-semibold text-on-action hover:bg-emerald-hover max-sm:flex-1">
            {t("See my withdrawals")}
          </Link>
        </div>
      </section>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={cancel}
        isPending={isCancelling}
        icon={<X />}
        title={t("Cancel this request?")}
        description={t("{id} for {amount}. The money goes back to your balance.", { id: request.displayId, amount: money(request.amount) })}
        confirmLabel={t("Cancel request")}
        cancelLabel={t("Keep it")}
      />
    </div>
  );
}
