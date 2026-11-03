"use client";

import { X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { createBudgetCategoryAction, type BudgetCategoryName } from "@/lib/customer/budgetActions";
import { CATEGORY_NAME_MAX, categoryNameError, categoryServerError } from "@/lib/customer/categoryName";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface NewCategoryFormProps {
  businessId: string;
  kind: "INCOME" | "EXPENSE";
  // The kind's names already in the workspace.
  taken: readonly string[];
  onAdded: (category: BudgetCategoryName) => void;
  // Shown as an X when the form can be put away.
  onCancel?: () => void;
  autoFocus?: boolean;
}

// A category added from the transaction popup itself, so the entry being
// typed isn't lost on a trip to Category Set: a name and Add. The colour is
// the API's pick (one the kind doesn't use yet); Category Set changes it.
export function NewCategoryForm({ businessId, kind, taken, onAdded, onCancel, autoFocus = false }: NewCategoryFormProps) {
  const { t } = useLocale();
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (isPending) return;
    const problem = categoryNameError(name, taken);
    if (problem) {
      setError(problem);
      return;
    }
    startTransition(async () => {
      const result = await createBudgetCategoryAction(businessId, { type: kind, name: name.trim(), icon: null });
      if (!result.success || !result.data) {
        setError(categoryServerError(result.message));
        return;
      }
      const { id: categoryId, name: added, icon, color } = result.data;
      toast.success(t("Category added"));
      setName("");
      setError(null);
      onAdded({ id: categoryId, name: added, icon, color });
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          size="md"
          frameClassName="flex-1"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          // Enter adds the category; it must not save the transaction.
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          maxLength={CATEGORY_NAME_MAX}
          placeholder={t(kind === "INCOME" ? "New income category" : "New expense category")}
          aria-label={t(kind === "INCOME" ? "New income category" : "New expense category")}
          invalid={error !== null}
          disabled={isPending}
          autoFocus={autoFocus}
        />
        <Button type="button" variant="action" size="lg" onClick={add} disabled={isPending}>
          {t("Add")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon-lg" onClick={onCancel} disabled={isPending} aria-label={t("Cancel")}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption text-expense">
          {t(error)}
        </p>
      )}
    </div>
  );
}
