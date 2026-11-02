"use client";

import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface DeletedTransfer {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  charge: number;
  note: string | null;
}

interface TransferDeleteDialogProps {
  transfer: DeletedTransfer | null;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// Delete a transfer (board: Transfers — Delete popup): what it was, and
// what each account gets back -- the sender its money and the charge, the
// receiver gives the money back.
export function TransferDeleteDialog({ transfer, currency, busy, onClose, onConfirm }: TransferDeleteDialogProps) {
  const { t, fmt } = useLocale();
  if (!transfer) return null;
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const what = [formatDate(transfer.date, undefined, fmt), money(transfer.amount), transfer.note].filter(Boolean).join(" · ");

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} role="alertdialog" className="flex w-105 max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-[18px] border-0 bg-surface p-6 shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <DialogTitle className="text-[18px] font-semibold text-ink">{t("Delete this transfer?")}</DialogTitle>
        <DialogDescription className="text-body leading-normal text-ink-2">{t("{transfer}. It is removed for good, from here, from Accounts and from the Ledger.", { transfer: what })}</DialogDescription>
        <div className="mt-1 flex flex-col overflow-hidden rounded-[14px] border border-line">
          <div className="flex items-center gap-2.5 border-b border-divider px-3.5 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-semibold text-ink">{transfer.from}</span>
              <span className="text-caption text-ink-muted">{transfer.charge > 0 ? t("Gets the money back, plus the {amount} charge", { amount: money(transfer.charge) }) : t("Gets the money back")}</span>
            </span>
            <span className="text-body font-bold whitespace-nowrap text-income tabular-nums">{`+ ${money(transfer.amount + transfer.charge)}`}</span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-semibold text-ink">{transfer.to}</span>
              <span className="text-caption text-ink-muted">{t("The money goes back out")}</span>
            </span>
            <span className="text-body font-bold whitespace-nowrap text-expense tabular-nums">{`− ${money(transfer.amount)}`}</span>
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("Cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy && <Loader size={16} onDark label={t("Deleting...")} />}
            {t("Delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
