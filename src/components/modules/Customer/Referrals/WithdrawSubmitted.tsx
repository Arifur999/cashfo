"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { formatCurrency } from "@/lib/customer/currency";
import { cancelWithdrawalAction } from "@/lib/customer/referralActions";
import { maskAccount, maskWallet, METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import type { PayoutRequest } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WithdrawSubmittedProps {
  request: PayoutRequest;
  // The money-sent notice goes by SMS (a verified phone), else by email.
  bySms: boolean;
  currency: string;
}

export const WITHDRAWALS_TAB = "/referrals/withdrawals";

// Withdrawal requested (WithdrawSubmitted): the amount, where it goes and
// the request's number, the four steps it goes through (with the day it
// should be paid by), and the way to cancel it while nobody has approved it.
export function WithdrawSubmitted({ request, bySms, currency }: WithdrawSubmittedProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isCancelling, startCancel] = useTransition();
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const method = request.method;
  const service = method.type === "BANK" ? (method.bankName ?? t("Bank")) : METHOD_BRANDS[method.type].name;
  const number = method.type === "BANK" ? maskAccount(method.accountNumber) : maskWallet(method.walletNumber);
  const expected = formatDate(`${request.expectedBy}T06:00:00Z`, "EEE, d MMM", request.expectedBy, fmt);
  const count = request.lines.length;

  const steps = [
    {
      title: t("Requested@@payout"),
      body: t(count === 1 ? "{when} · {count} payment, {amount}" : "{when} · {count} payments, {amount}", { when: formatDate(request.createdAt, "EEE, d MMM", "", fmt), count: formatCount(count, fmt), amount: money(request.amount) }),
      done: true,
    },
    { title: t("Checked by our team"), body: t("We match each friend's payment with what reached us"), done: false },
    { title: t("Approved@@payout"), body: t("Usually within 1 working day"), done: false },
    { title: t("Paid@@payout"), body: bySms ? t("By {date}. You get the transaction ID here and by SMS.", { date: expected }) : t("By {date}. You get the transaction ID here and by email.", { date: expected }), done: false },
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
    <div className="flex justify-center md:pt-1">
      <section aria-labelledby="ws-title" className="w-full max-w-160 overflow-hidden rounded-card border border-line-card bg-surface shadow-[0_4px_16px_rgba(18,32,29,0.06)]">
        <div className="flex flex-col items-center gap-2.5 border-b border-divider px-5 pt-7 pb-5 text-center md:px-8">
          <span aria-hidden="true" className="flex size-15 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <Check className="size-7.5" strokeWidth={2.5} />
          </span>
          <h1 id="ws-title" className="text-[22px] font-semibold text-ink">
            {t("Withdrawal requested")}
          </h1>
          <p className="text-[15px] leading-[1.55] text-ink-soft tabular-nums">{[money(request.amount), `${service} ${number}`, method.accountName].join(" · ")}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-0.75 text-[12.5px] text-ink-soft">
            {t("Request")} <b className="font-mono text-ink">{request.displayId}</b>
          </span>
        </div>

        <ol className="flex flex-col px-5 pt-5 pb-1 md:px-8">
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3.5">
              <span className="flex flex-col items-center">
                <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", step.done ? "bg-emerald text-on-action" : "border-2 border-input bg-surface")}>
                  {step.done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {index < steps.length - 1 && <span aria-hidden="true" className={cn("min-h-5.5 w-0.5 flex-1", step.done ? "bg-emerald/50" : "bg-line")} />}
              </span>
              <span className="flex flex-col gap-0.5 pb-4">
                <span className={cn("text-[15px] font-semibold", step.done ? "text-ink" : "text-ink-soft")}>
                  {step.title}
                  <span className="sr-only">{step.done ? `, ${t("done")}` : `, ${t("next")}`}</span>
                </span>
                <span className="text-[13px] text-ink-muted">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2.5 px-5 pt-4 pb-6 md:px-8">
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
        title={t("Cancel {id}?", { id: request.displayId })}
        description={t(count === 1 ? "{amount} will not be sent. This payment goes back to your available balance, and you can withdraw it again later." : "{amount} will not be sent. These {count} payments go back to your available balance, and you can withdraw them again later.", { amount: money(request.amount), count: formatCount(count, fmt) })}
        confirmLabel={t("Cancel request")}
        cancelLabel={t("Keep it")}
      />
    </div>
  );
}
