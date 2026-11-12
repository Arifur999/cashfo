"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { CategorySetRow } from "@/lib/customer/api";
import { deleteBudgetCategoryAction, restoreBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IEConfirmDialog } from "./IEConfirmDialog";

interface DeleteCategoryDialogProps {
  businessId: string;
  row: CategorySetRow;
  // The same type's other categories its transactions can move to.
  others: CategorySetRow[];
  onClose: () => void;
  onDeleted: () => void;
}

// How long the toast offers Undo.
const UNDO_MS = 6000;

// Category Set's Delete (design: CategoryDelete). Nothing uses it: it goes.
// Transactions use it: they move to another category of the type first, so
// none is left without one; the only one of its type can't go. Either way
// the toast's Undo makes it again and takes back the transactions it moved.
export function DeleteCategoryDialog({ businessId, row, others, onClose, onDeleted }: DeleteCategoryDialogProps) {
  const { t, fmt } = useLocale();
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const used = row.transactionCount;
  const blocked = used > 0 && others.length === 0;
  const name = categoryLabel(row.name, t);

  function remove() {
    if (isPending || blocked) return;
    startTransition(async () => {
      const result = await deleteBudgetCategoryAction(businessId, row.id, used > 0 ? moveTo : undefined);
      if (!result.success) {
        toast.error(t(result.message ?? "Failed to delete category"));
        return;
      }
      onClose();
      onDeleted();
      const moved = result.data?.moved ?? 0;
      const target = others.find((other) => other.id === moveTo);
      const movedEntryIds = result.data?.movedEntryIds ?? [];
      // An older backend doesn't say which moved: then there is no Undo.
      if (moved > 0 && (!target || movedEntryIds.length === 0)) {
        toast.success(t("Category deleted"));
        return;
      }
      const again = {
        type: row.type,
        name: row.name,
        icon: row.icon,
        color: row.color,
        ...(row.monthlyLimit !== null && row.type === "EXPENSE" && { monthlyLimit: Number(row.monthlyLimit) }),
        ...(moved > 0 && target && { movedTo: target.name, entryIds: movedEntryIds }),
      };
      toast.success(t("Category deleted"), {
        duration: UNDO_MS,
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = await restoreBudgetCategoryAction(businessId, again);
            if (back.success) {
              toast.success(t("Category restored"));
              onDeleted();
            } else {
              toast.error(t(back.message ?? "Failed to create category"));
            }
          },
        },
      });
    });
  }

  return (
    <IEConfirmDialog
      open
      onClose={onClose}
      width={440}
      title={t("Delete \"{name}\"?", { name })}
      message={
        used === 0
          ? t("No transaction uses it, so nothing else changes.")
          : plural(t, used, "{count} transaction uses this category. Pick where it goes so none are left without a category.", "{count} transactions use this category. Pick where they go so none are left without a category.", undefined, fmt)
      }
      confirmLabel={t(used > 0 && !blocked ? "Move and delete" : "Delete")}
      onConfirm={remove}
      busy={isPending}
      disabled={blocked}
    >
      {used > 0 && !blocked && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cat-move" className="text-body font-medium text-ink">
            {t("Move them to")}
          </label>
          <NativeSelect id="cat-move" value={moveTo} onChange={(event) => setMoveTo(event.target.value)} className="h-11.5 font-normal">
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {categoryLabel(other.name, t)}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      {blocked && (
        <p className="rounded-field bg-orange-soft/50 px-3 py-2.5 text-small leading-[1.45] text-orange">
          {t(row.type === "INCOME" ? "This is the only income category. Add another one first, then delete this." : "This is the only expense category. Add another one first, then delete this.")}
        </p>
      )}
    </IEConfirmDialog>
  );
}
