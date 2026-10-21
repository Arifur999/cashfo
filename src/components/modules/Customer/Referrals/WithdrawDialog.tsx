"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { withdrawReferralEarningsAction } from "@/lib/customer/referralActions";
import { listActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  availableBalance: string;
  currency: string;
  // A business workspace's name, said in the picker's label; null in the
  // reader's own personal workspace.
  workspaceName: string | null;
}

// What the wallet lists came back as. A failed load is told apart from an
// empty one, so an outage never reads "No wallet yet".
interface WalletLoad {
  wallets: Account[];
  savings: Account[];
  failed: boolean;
}

// Move every available reward into one of the user's own wallets or
// savings wallets, in one posting.
export function WithdrawDialog({ open, onClose, businessId, availableBalance, currency, workspaceName }: WithdrawDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  // The wallets, fetched each time the dialog opens (and on Try again);
  // null while they load.
  const [load, setLoad] = useState<WalletLoad | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setLoad(null);
  }

  useEffect(() => {
    if (!open) return;
    // A reply that lands after the dialog closed (or a retry started) is
    // dropped; one that never comes (offline) ends as a failure, not an
    // endless "Loading...".
    let cancelled = false;
    Promise.all([listMoneyAccountsAction(businessId), listActiveSavingsWalletsAction(businessId)])
      .then(([money, pots]) => {
        if (cancelled) return;
        const wallets = money.data ?? [];
        const savings = pots.data ?? [];
        setLoad({ wallets, savings, failed: !money.success || !pots.success });
        // The last choice stays while its wallet is still on offer.
        setAccountId((current) => ([...wallets, ...savings].some((account) => account.id === current) ? current : (wallets[0]?.id ?? savings[0]?.id ?? "")));
      })
      .catch(() => {
        if (!cancelled) setLoad({ wallets: [], savings: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [open, businessId, attempt]);

  const wallets = load?.wallets ?? [];
  const savings = load?.savings ?? [];
  const loading = open && load === null;
  const failed = !!load?.failed;
  const amount = Number(availableBalance);
  const target = [...wallets, ...savings].find((account) => account.id === accountId) ?? null;

  function retry() {
    setLoad(null);
    setAttempt((count) => count + 1);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target || isPending) return;
    startTransition(async () => {
      try {
        const result = await withdrawReferralEarningsAction(businessId, target.id);
        if (result.success && result.data) {
          const moved = formatCurrency(result.data.withdrawnAmount, currency);
          toast.success(t("{amount} moved to {wallet}", { amount: moved, wallet: target.name }));
          onClose();
          router.refresh();
        } else {
          // The backend's refusal in its own words, which the dictionary knows.
          toast.error(t(result.message ?? "Failed to withdraw earnings"));
        }
      } catch {
        // Offline, or no answer: the dialog stays open to try again, instead
        // of the error reaching the page's error screen.
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Withdraw your rewards")}</AlertDialogTitle>
            <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-50">
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
            {/* No error of its own for an empty list: the picker then says
                "No wallet yet" with its link to add one. */}
            <WalletPicker
              label={workspaceName ? t("Move it to a wallet in {workspace}", { workspace: workspaceName }) : t("Move it to")}
              variant="money"
              wallets={wallets}
              savingsWallets={savings}
              value={accountId}
              onChange={setAccountId}
              after={target ? Number(target.currentBalance) + amount : null}
              currency={currency}
              loading={loading}
              error={failed ? "Couldn't load your wallets." : null}
              onClose={onClose}
            />
            {failed && (
              <Button type="button" variant="secondary" size="sm" onClick={retry} className="self-start pointer-coarse:h-11">
                <RefreshCw aria-hidden="true" />
                {t("Try again")}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!target || amount <= 0 || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Withdraw {amount}", { amount: formatCurrency(amount, currency) })}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
