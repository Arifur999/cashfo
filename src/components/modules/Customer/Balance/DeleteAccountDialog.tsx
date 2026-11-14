"use client";

import { Archive, Trash2 } from "lucide-react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { WalletOverviewRow } from "@/lib/customer/api";
import { hasHistory } from "@/lib/customer/balanceDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

interface DeleteAccountDialogProps {
  account: WalletOverviewRow | null;
  name: string;
  busy: boolean;
  onClose: () => void;
  // No history: delete it for good.
  onDelete: () => void;
  // History: archive it instead (not offered again on an archived one).
  onArchive: () => void;
}

// Delete an account (board: Accounts' Delete popup). One nothing was ever
// posted to goes for good; one with transactions would break the history,
// so it offers Archive instead.
export function DeleteAccountDialog({ account, name, busy, onClose, onDelete, onArchive }: DeleteAccountDialogProps) {
  const { t, fmt } = useLocale();
  if (!account) return null;
  const history = hasHistory(account);
  const archived = account.status === "ARCHIVED";
  // The transactions its ledger lists, not the deleted ones still on file.
  const count = account.standingCount ?? account.entryCount ?? 0;

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} role="alertdialog" className="flex w-105 max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-[20px] border-0 bg-surface p-6 shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <span className={cn("flex size-11.5 items-center justify-center rounded-[12px] [&_svg]:size-5.5", history ? "bg-warning-soft text-warning" : "bg-expense-soft text-expense")}>
          {history ? <Archive aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
        </span>
        <div className="flex flex-col gap-1.5">
          <DialogTitle className="text-[18px] font-semibold text-ink">
            {history && count > 0 ? plural(t, count, "{name} has {count} transaction", "{name} has {count} transactions", { name }, fmt) : t("Delete {name}?", { name })}
          </DialogTitle>
          <DialogDescription className="text-body leading-normal text-ink-soft">
            {t(
              history
                ? "Deleting it would break your history and balances. Archive it instead: it leaves your lists, and everything stays safe."
                : "It has no transactions yet, so nothing else changes.",
            )}
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={busy} className="px-4">
            {t("Cancel")}
          </Button>
          {history ? (
            <Button onClick={archived ? onClose : onArchive} disabled={busy} className="px-4.5 shadow-none">
              {busy && <Loader size={16} onDark label={t("Saving...")} />}
              {t(archived ? "Keep it archived" : "Archive instead")}
            </Button>
          ) : (
            <Button variant="danger" onClick={onDelete} disabled={busy} className="bg-expense px-4.5 hover:bg-expense/90">
              {busy && <Loader size={16} onDark label={t("Deleting...")} />}
              {t("Delete")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
