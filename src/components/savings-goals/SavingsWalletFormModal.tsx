"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { createAccountAction, updateAccountAction } from "@/lib/accountActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SavingsWalletFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingWallet: Account | null;
}

// Same shape as Balance's own WalletFormModal (name/account number/opening
// balance), just accountSubtype "savings" instead of "bank" -- a Savings
// Wallet is a regular money-holding place, just kept out of the ordinary
// Income/Expense/Transfer pickers (see AccountsService.listSavingsWallets()).
export function SavingsWalletFormModal({ open, onClose, businessId, editingWallet }: SavingsWalletFormModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingWallet?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingWallet) {
        setName(editingWallet.name);
        setAccountNumber(editingWallet.accountNumber ?? "");
      } else {
        setName("");
        setAccountNumber("");
        setOpeningBalance("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingWallet
        ? await updateAccountAction(businessId, editingWallet.id, {
            name,
            accountNumber: accountNumber || undefined,
          })
        : await createAccountAction(businessId, {
            name,
            accountNumber: accountNumber || undefined,
            accountType: "ASSET",
            accountSubtype: "savings",
            openingBalance: openingBalance || undefined,
          });

      if (result.success) {
        toast.success(editingWallet ? t("Savings Wallet updated") : t("Savings Wallet created"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingWallet ? t("Failed to update Savings Wallet") : t("Failed to create Savings Wallet")));
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingWallet ? t("Edit Savings Wallet") : t("Add Savings Wallet")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Wallet Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Islami Bank DPS")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Account Number")} <span className="text-neutral-400">({t("Optional")})</span>
          </label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={t("e.g. 01711223344")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {!editingWallet && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Opening Balance")} <span className="text-neutral-400">({t("Optional")})</span>
            </label>
            <input
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingWallet ? t("Save Changes") : t("Create")}
        </button>
      </div>
    </Modal>
  );
}
