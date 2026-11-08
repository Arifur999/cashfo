"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { IEConfirmDialog } from "@/components/modules/Customer/IncomeExpense/IEConfirmDialog";
import AmountText from "@/components/smartly/AmountText";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatDate } from "@/lib/customer/date";
import { restoreTransactionAction, voidTransactionAction } from "@/lib/customer/transactionActions";
import { DELETED_REASON } from "@/lib/customer/transactionDisplay";
import { categoryLabel, rowTitle, type TransactionRow } from "@/lib/customer/transactionRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DeleteTransactionDialogProps {
  row: TransactionRow;
  businessId: string;
  currency: string;
  onClose: () => void;
}

// How long the toast offers Undo; the backend takes it back for 10 minutes.
const UNDO_MS = 6000;

// Transactions' Delete (design: TxnDelete): the row it removes, then the
// toast with Undo. Underneath it is a void with DELETED_REASON, the one
// reason the backend lets its owner take back.
export function DeleteTransactionDialog({ row, businessId, currency, onClose }: DeleteTransactionDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const title = rowTitle(row, t);
  const category = row.uncategorised ? t("Uncategorised") : row.category ? categoryLabel(row.category.name, t) : null;
  const details = [formatDate(row.transaction.transactionDate, "d MMM yyyy", fmt), category, row.wallet].filter(Boolean).join(" · ");

  // The toast's Undo runs after this dialog is gone: it needs only the id.
  async function undo(id: string) {
    const result = await restoreTransactionAction(businessId, id);
    if (result.success) {
      toast.success(t("Transaction restored"));
      router.refresh();
    } else {
      toast.error(t(result.message ?? "Couldn't bring the transaction back"));
    }
  }

  function remove() {
    if (isPending) return;
    const id = row.transaction.id;
    startTransition(async () => {
      const result = await voidTransactionAction(businessId, id, DELETED_REASON);
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to delete the transaction"));
        return;
      }
      onClose();
      router.refresh();
      toast.success(t("Transaction deleted"), { duration: UNDO_MS, action: { label: t("Undo"), onClick: () => void undo(id) } });
    });
  }

  return (
    <IEConfirmDialog
      open
      onClose={onClose}
      title={t("Delete this transaction?")}
      message={t("It is removed from Transactions, the Overview totals and Budget Planning.")}
      confirmLabel={t("Delete")}
      onConfirm={remove}
      busy={isPending}
    >
      <div className="mt-1 flex items-center gap-3 rounded-[14px] border border-line px-3.5 py-3">
        <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", row.uncategorised ? "text-ink-faint" : categoryTone(row.category?.color).fg)} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span title={title} className="truncate text-body font-semibold text-ink">{title}</span>
          <span className="truncate text-caption text-ink-muted">{details}</span>
        </span>
        <AmountText value={row.signedAmount} currency={currency} signed tone="inherit" size="sm" className={cn("shrink-0 text-[15px] font-bold whitespace-nowrap", row.signedAmount > 0 ? "text-tint-green-ink" : "text-expense-fill")} />
      </div>
    </IEConfirmDialog>
  );
}
