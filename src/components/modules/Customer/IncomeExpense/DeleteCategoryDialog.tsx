"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CategorySetRow } from "@/lib/customer/api";
import { createBudgetCategoryAction, deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
    <Dialog open onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} className="w-105 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay sm:max-w-105">
        <DialogTitle className="text-h3 text-ink">{t("Delete \"{name}\"?", { name })}</DialogTitle>
        <DialogDescription className="mt-2 text-body text-ink-2">
          {used === 0
            ? t("No transaction uses it, so nothing else changes.")
            : blocked
              ? t(row.type === "INCOME" ? "This is the only income category. Add another one first, then delete this." : "This is the only expense category. Add another one first, then delete this.")
              : plural(t, used, "{count} transaction uses this category. Pick where it goes so none are left without a category.", "{count} transactions use this category. Pick where they go so none are left without a category.", undefined, fmt)}
        </DialogDescription>
        {used > 0 && !blocked && (
          <Field htmlFor="cat-move" label={<span className="text-body font-medium text-ink">{t("Move them to")}</span>} className="mt-4">
            <NativeSelect id="cat-move" value={moveTo} onChange={(event) => setMoveTo(event.target.value)}>
              {others.map((other) => (
                <option key={other.id} value={other.id}>
                  {categoryLabel(other.name, t)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="button" variant="danger" onClick={remove} disabled={isPending || blocked}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {t(used > 0 && !blocked ? "Move and delete" : "Delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
