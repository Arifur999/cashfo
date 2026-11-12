"use client";

import { X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { createBudgetCategoryAction, type BudgetCategoryName } from "@/lib/customer/budgetActions";
import { CATEGORY_NAME_MAX, CATEGORY_NAME_WORDS, categoryNameProblem, categoryServerProblem } from "@/lib/customer/categoryName";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NewCategoryFormProps {
  businessId: string;
  kind: "INCOME" | "EXPENSE";
  // The kind's names already in the workspace.
  taken: readonly string[];
  onAdded: (category: BudgetCategoryName) => void;
  // Shown as an X when the form can be put away.
  onCancel?: () => void;
  autoFocus?: boolean;
  // The desktop popup's list (design: TxnCategoryOpen): a 40px name box,
  // a 40px Add pill and a round grey X.
  compact?: boolean;
}

// A category added from the transaction popup itself, so the entry being
// typed isn't lost on a trip to Category Set: a name and Add. The colour is
// the API's pick (one the kind doesn't use yet); Category Set changes it.
export function NewCategoryForm({ businessId, kind, taken, onAdded, onCancel, autoFocus = false, compact = false }: NewCategoryFormProps) {
  const { t } = useLocale();
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (isPending) return;
    const problem = categoryNameProblem(name, taken);
    if (problem) {
      setError(CATEGORY_NAME_WORDS.popup[problem]);
      return;
    }
    startTransition(async () => {
      const result = await createBudgetCategoryAction(businessId, { type: kind, name: name.trim(), icon: null });
      if (!result.success || !result.data) {
        const refused = categoryServerProblem(result.message);
        setError(refused ? CATEGORY_NAME_WORDS.popup[refused] : (result.message ?? "Failed to create category"));
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
          frameClassName={cn("flex-1", compact && "h-10 rounded-sm px-2.5")}
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
          placeholder={t(compact ? (kind === "INCOME" ? "e.g. Rental income" : "e.g. Mobile & Internet") : kind === "INCOME" ? "New income category" : "New expense category")}
          aria-label={t(compact ? "New category name" : kind === "INCOME" ? "New income category" : "New expense category")}
          invalid={error !== null}
          disabled={isPending}
          autoFocus={autoFocus}
        />
        <Button type="button" variant="action" size="lg" onClick={add} disabled={isPending} className={cn(compact && "h-10 px-3.5 text-[13.5px] shadow-none")}>
          {t("Add")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon-lg" onClick={onCancel} disabled={isPending} aria-label={t("Cancel")} className={cn(compact && "size-10 bg-surface-sunken text-ink-muted [&_svg]:size-3.75")}>
            <X strokeWidth={2.25} aria-hidden="true" />
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={cn("text-expense", compact ? "text-[12.5px]" : "text-caption")}>
          {t(error)}
        </p>
      )}
    </div>
  );
}
