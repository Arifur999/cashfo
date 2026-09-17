"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { withdrawReferralEarningsAction } from "@/lib/referralActions";
import { getActiveSavingsWalletsAction } from "@/lib/savingsGoalActions";

interface WithdrawReferralModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  availableBalance: string;
  currency: string;
}

// Cashes out the entire current availableBalance (see ReferralsPageClient --
// there's no partial-amount field, same "withdraw the whole thing" shape as
// SavingsWithdrawModal) into any account the user already owns -- general
// money account or Savings Wallet, same combined two-optgroup picker as
// PurchaseAssetModal's Account field, since both are really just "which of
// my existing accounts does this money land in".
export function WithdrawReferralModal({ open, onClose, businessId, availableBalance, currency }: WithdrawReferralModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAccountId("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([accounts, wallets]) => {
      setMoneyAccounts(accounts);
      setSavingsWallets(wallets);
      setAccountId((current) => current || accounts[0]?.id || wallets[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  function handleSubmit() {
    if (!accountId) {
      toast.error(t("Select an account to withdraw to"));
      return;
    }
    startTransition(async () => {
      const result = await withdrawReferralEarningsAction(businessId, accountId);
      if (result.success && result.data) {
        toast.success(`${t("Withdrew")} ${formatCurrency(result.data.withdrawnAmount, currency)}`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to withdraw earnings"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Withdraw Referral Earnings")}>
      <div className="space-y-4">
        <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          {t("Withdraw")} <span className="font-semibold text-neutral-900">{formatCurrency(availableBalance, currency)}</span> {t("to:")}
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account")}</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {moneyAccounts.length === 0 && savingsWallets.length === 0 && <option value="">{t("No accounts yet")}</option>}
            {moneyAccounts.length > 0 && (
              <optgroup label={t("General Accounts")}>
                {moneyAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {savingsWallets.length > 0 && (
              <optgroup label={t("Savings Accounts")}>
                {savingsWallets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {!loading && moneyAccounts.length === 0 && savingsWallets.length === 0 && (
            <p className="mt-1 text-xs text-brand-danger">{t("No accounts exist in this workspace yet -- add one in Chart of Accounts first.")}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={!accountId || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Withdraw Funds")}
      </button>
    </Modal>
  );
}
