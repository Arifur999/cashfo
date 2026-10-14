"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/modules/Customer/Shared/DatePicker";
import { Modal } from "@/components/modules/Customer/Shared/Modal";
import type { Account } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { createTransferAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getAppToday } from "@/lib/date";
import { NoWalletHint } from "./NoWalletHint";
import { limitMoneyDecimals } from "@/lib/customer/money";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

export function TransferModal({ open, onClose, businessId }: TransferModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  // Set when the wallets couldn't be loaded -- not the same as having none.
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setFromAccountId("");
      setToAccountId("");
      setDate(getAppToday());
      setDescription("");
      setLoading(true);
      setWalletsError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    listMoneyAccountsAction(businessId).then((result) => {
      const data = result.data ?? [];
      setAccounts(data);
      setWalletsError(result.success ? null : (result.message ?? "Failed to load your wallets"));
      setFromAccountId((current) => current || data[0]?.id || "");
      setToAccountId((current) => current || data[1]?.id || data[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const sameAccount = fromAccountId && toAccountId && fromAccountId === toAccountId;
  const isValid = Number(amount) > 0 && fromAccountId.length > 0 && toAccountId.length > 0 && !sameAccount;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTransferAction(businessId, {
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        date,
        description: description || undefined,
      });
      if (result.success) {
        toast.success(t("Transfer completed"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create transfer"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Move Money")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("From")}</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-neutral-400" />
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("To")}</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sameAccount && <p className="text-sm text-brand-danger">{t("From and To must be different accounts")}</p>}
        {!loading && walletsError && <p role="alert" className="mt-1 text-xs text-brand-danger">{t(walletsError)}</p>}
        {!loading && !walletsError && accounts.length < 2 && <NoWalletHint message="A transfer needs two wallets." onNavigate={onClose} />}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Amount")}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(limitMoneyDecimals(e.target.value))}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Description")} <span className="text-neutral-400">({t("Optional")})</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("e.g. Moving savings to bank")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
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
        {t("Move Money")}
      </button>
    </Modal>
  );
}
