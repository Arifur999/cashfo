"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modules/Customer/Shared/Modal";
import type { Account, InvoiceBreakdown } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { getMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getContactBalanceDetailAction, payPaymentAction, receivePaymentAction } from "@/lib/customer/receivablesPayablesActions";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { limitMoneyDecimals } from "@/lib/customer/money";

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  contactId: string;
  direction: "RECEIVABLE" | "PAYABLE";
  currency: string;
}

export function RecordPaymentModal({ open, onClose, businessId, contactId, direction, currency }: RecordPaymentModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [moneyAccountId, setMoneyAccountId] = useState("");
  const [appliedToTransactionId, setAppliedToTransactionId] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [outstanding, setOutstanding] = useState<InvoiceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setDate(getAppToday());
      setMoneyAccountId("");
      setAppliedToTransactionId("");
      setDescription("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getContactBalanceDetailAction(businessId, contactId)]).then(([moneyAccounts, detail]) => {
      setAccounts(moneyAccounts);
      setMoneyAccountId((current) => current || moneyAccounts[0]?.id || "");
      const breakdown = direction === "RECEIVABLE" ? detail?.receivable : detail?.payable;
      setOutstanding((breakdown?.transactions ?? []).filter((t) => Number(t.remainingAmount) > 0));
      setLoading(false);
    });
  }, [open, businessId, contactId, direction]);

  const title = t(direction === "RECEIVABLE" ? "Record Payment Received" : "Record Payment Made");
  const accountLabel = t(direction === "RECEIVABLE" ? "Which account did it land in?" : "Which account did it come from?");

  function handleSubmit() {
    startTransition(async () => {
      const input = {
        contactId,
        amount: Number(amount),
        date,
        moneyAccountId,
        description: description || undefined,
        appliedToTransactionId: appliedToTransactionId || undefined,
      };
      const result = direction === "RECEIVABLE" ? await receivePaymentAction(businessId, input) : await payPaymentAction(businessId, input);

      if (result.success) {
        toast.success(t("Payment recorded"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record payment"));
      }
    });
  }

  const isValid = Number(amount) > 0 && moneyAccountId.length > 0;
  const translateUntitled = t("Untitled");
  const leftLabel = t("left");

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Amount")}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(limitMoneyDecimals(e.target.value))}
            placeholder="0.00"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{accountLabel}</label>
          <select
            value={moneyAccountId}
            onChange={(e) => setMoneyAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Apply to specific transaction")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <select
            value={appliedToTransactionId}
            onChange={(e) => setAppliedToTransactionId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            <option value="">{t("General payment (applies to oldest first)")}</option>
            {outstanding.map((t) => (
              <option key={t.transactionId} value={t.transactionId}>
                {formatDate(t.date)} · {t.description ?? translateUntitled} · {formatCurrency(t.remainingAmount, currency)} {leftLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Description")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Save")}
      </button>
    </Modal>
  );
}
