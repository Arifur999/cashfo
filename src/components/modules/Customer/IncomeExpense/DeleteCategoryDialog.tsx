"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { CategorySetRow } from "@/lib/customer/api";
import { createBudgetCategoryAction, deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
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

// How long the toast offers Undo for a category nothing used.
const UNDO_MS = 6000;

// Category Set's Delete (design: CategoryDelete). Nothing uses it: it goes,
// with Undo. Transactions use it: they move to another category of the type
// first, so none is left without one; the only one of its type can't go.
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
      if (moved > 0 && target) {
        toast.success(t("Category deleted"), {
          description: plural(t, moved, "{count} transaction moved to {name}.", "{count} transactions moved to {name}.", { name: categoryLabel(target.name, t) }, fmt),
        });
        return;
      }
      // Nothing used it: Undo makes it again as it was.
      const again = { type: row.type, name: row.name, icon: row.icon, color: row.color };
      toast.success(t("Category deleted"), {
        duration: UNDO_MS,
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = await createBudgetCategoryAction(businessId, again);
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
