"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { getMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { withdrawReferralEarningsAction } from "@/lib/customer/referralActions";
import { getActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  availableBalance: string;
  currency: string;
}

// Move every available reward into one of the user's own wallets or
// savings pots, in one posting.
export function WithdrawDialog({ open, onClose, businessId, availableBalance, currency }: WithdrawDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  // The wallets, fetched each time the dialog opens; null while they load.
  const [accounts, setAccounts] = useState<{ wallets: Account[]; savings: Account[] } | null>(null);
  const [accountId, setAccountId] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setAccounts(null);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([getMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([money, pots]) => {
      if (cancelled) return;
      setAccounts({ wallets: money, savings: pots });
      setAccountId((current) => current || money[0]?.id || pots[0]?.id || "");
    });
    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  const wallets = accounts?.wallets ?? [];
  const savings = accounts?.savings ?? [];
  const loading = open && accounts === null;
  const amount = Number(availableBalance);
  const target = [...wallets, ...savings].find((account) => account.id === accountId) ?? null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!accountId || isPending) return;
    startTransition(async () => {
      const result = await withdrawReferralEarningsAction(businessId, accountId);
      if (result.success && result.data) {
        toast.success(`${formatCurrency(result.data.withdrawnAmount, currency)} ${t("moved to")} ${target?.name ?? t("your wallet")}`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to withdraw earnings"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Withdraw your rewards")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">
            {t("Everything available goes in one go. Pick where it lands.")}
          </AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex items-baseline justify-between rounded-md bg-mint-50 px-4 py-3">
              <span className="text-small font-medium text-ink-2">{t("Available to withdraw")}</span>
              <span className="text-h3 font-bold text-emerald tabular-nums">{formatCurrency(amount, currency)}</span>
            </div>
            <WalletPicker label={t("Into")} variant="money" wallets={wallets} savingsWallets={savings} value={accountId} onChange={setAccountId} after={target ? Number(target.currentBalance) + amount : null} currency={currency} loading={loading} error={!loading && wallets.length === 0 && savings.length === 0 ? t("No wallet yet. Add one under Wallets first.") : null} onClose={onClose} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!accountId || amount <= 0 || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Withdraw")} {formatCurrency(amount, currency)}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
