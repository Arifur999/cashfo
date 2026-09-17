"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import type { Account, Contact } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { payPaymentAction, receivePaymentAction, recordPurchaseAction, recordSaleAction } from "@/lib/receivablesPayablesActions";

interface NewLoanTransactionModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // Named for this page's context, but it's every contact in the business,
  // not just category: LOAN ones -- see the page's data-fetching comment.
  loanContacts: Contact[];
}

type TxnKind = "GIVE_LOAN" | "TAKE_LOAN" | "RECEIVE_PAYMENT" | "MAKE_PAYMENT";

const KIND_OPTIONS: { value: TxnKind; label: string }[] = [
  { value: "GIVE_LOAN", label: "Give a Loan" },
  { value: "TAKE_LOAN", label: "Take a Loan" },
  { value: "RECEIVE_PAYMENT", label: "Receive Payment" },
  { value: "MAKE_PAYMENT", label: "Make Payment" },
];

// A quick-add flow for the Transactions page's "+ New Transaction" button
// -- lets the user pick a Bank/Person and a kind directly, rather than
// having to navigate to that contact's own detail page first (which still
// has the same four actions, just contact-by-contact via
// ReceivablePayableSection). Every kind requires a money account: giving/
// taking a loan moves real cash now (see
// ReceivablesPayablesService.recordSale()'s comment on the backend), and
// payments always have too.
export function NewLoanTransactionModal({ open, onClose, businessId, loanContacts }: NewLoanTransactionModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [contactId, setContactId] = useState("");
  const [kind, setKind] = useState<TxnKind>("GIVE_LOAN");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [moneyAccountId, setMoneyAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isPending, startTransition] = useTransition();
  // Bumped every time the modal reopens -- keys the Contact Combobox below
  // so it fully remounts (fresh internal typed-text state) the same moment
  // contactId is reset here, instead of needing a value-sync effect inside
  // Combobox (see that component's doc comment).
  const [resetCount, setResetCount] = useState(0);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setContactId(loanContacts[0]?.id ?? "");
      setKind("GIVE_LOAN");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setMoneyAccountId("");
      setDescription("");
      setLoadingAccounts(true);
      setResetCount((n) => n + 1);
    }
  }

  useEffect(() => {
    if (!open) return;
    getMoneyAccountsAction(businessId).then((data) => {
      setAccounts(data);
      setMoneyAccountId((current) => current || data[0]?.id || "");
      setLoadingAccounts(false);
    });
  }, [open, businessId]);

  function handleSubmit() {
    startTransition(async () => {
      const base = { contactId, amount: Number(amount), date, description: description || undefined };
      const result =
        kind === "GIVE_LOAN"
          ? await recordSaleAction(businessId, { ...base, moneyAccountId })
          : kind === "TAKE_LOAN"
            ? await recordPurchaseAction(businessId, { ...base, moneyAccountId })
            : kind === "RECEIVE_PAYMENT"
              ? await receivePaymentAction(businessId, { ...base, moneyAccountId })
              : await payPaymentAction(businessId, { ...base, moneyAccountId });

      if (result.success) {
        toast.success(t("Transaction recorded"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record transaction"));
      }
    });
  }

  const isValid = contactId.length > 0 && Number(amount) > 0 && moneyAccountId.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t("New Transaction")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Contact")}</label>
          <Combobox
            key={resetCount}
            value={contactId}
            onChange={setContactId}
            options={loanContacts.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={t("Search contacts by name")}
            emptyMessage={t("No contacts added yet")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Type")}</label>
          <div className="grid grid-cols-2 gap-2">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  kind === opt.value ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {t(opt.label)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Amount")}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account")}</label>
          <select
            value={moneyAccountId}
            onChange={(e) => setMoneyAccountId(e.target.value)}
            disabled={loadingAccounts}
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
            {t("Notes")} <span className="text-neutral-400">{t("(optional)")}</span>
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
