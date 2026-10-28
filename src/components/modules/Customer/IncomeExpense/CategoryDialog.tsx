"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { BudgetCategoryType } from "@/lib/customer/api";
import { createBudgetCategoryAction, updateBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IEDialog, KindCards } from "./IEDialog";

export interface CategoryDialogState {
  // null: a new category.
  id: string | null;
  type: BudgetCategoryType;
  name: string;
}

interface CategoryDialogProps {
  businessId: string;
  editing: CategoryDialogState | null;
  onClose: () => void;
  onSaved: () => void;
}

export const KIND_OPTIONS = [
  { value: "INCOME" as const, label: "Income", sub: "Money coming in", icon: <ArrowUp strokeWidth={2.25} />, tone: "income" as const },
  { value: "EXPENSE" as const, label: "Expense", sub: "Money going out", icon: <ArrowDown strokeWidth={2.25} />, tone: "expense" as const },
];

// Category Set's New / Edit category popup: the kind and the name. A new
// category gets a colour of its own; renaming one renames it on its
// transactions too (the API carries them along).
export function CategoryDialog({ businessId, editing, onClose, onSaved }: CategoryDialogProps) {
  const { t } = useLocale();
  const [type, setType] = useState<BudgetCategoryType>("EXPENSE");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  // Each opening starts from what it was opened with.
  const [seen, setSeen] = useState<CategoryDialogState | null>(null);
  if (editing !== seen) {
    setSeen(editing);
    if (editing) {
      setType(editing.type);
      setName(editing.name);
    }
  }

  const isNew = editing?.id === null;
  const trimmed = name.trim();

  function save() {
    if (!editing || !trimmed) return;
    startTransition(async () => {
      const result = isNew ? await createBudgetCategoryAction(businessId, { type, name: trimmed, icon: null }) : await updateBudgetCategoryAction(businessId, editing.id as string, { name: trimmed });
      if (result.success) {
        toast.success(t(isNew ? "Category added" : "Category updated"));
        onSaved();
        onClose();
      } else {
        toast.error(t(result.message ?? "Failed to save the category"));
      }
    });
  }

  return (
    <IEDialog
      open={editing !== null}
      onClose={onClose}
      title={t(isNew ? "New category" : "Edit category")}
      busy={isPending}
      saveLabel="Save category"
      saveDisabled={!trimmed || trimmed.length > 60}
      onSubmit={save}
    >
      {/* A category keeps its kind: its transactions are of that kind. */}
      {isNew ? (
        <KindCards legend="Type" value={type} onChange={setType} options={KIND_OPTIONS} />
      ) : (
        <p className="text-small text-ink-muted">{t(type === "INCOME" ? "An income category." : "An expense category.")}</p>
      )}
      <Field
        htmlFor="cat-name"
        label={<span className="text-body font-medium text-ink">{t("Category name")}</span>}
        hint={<span className="text-small text-ink-muted">{t(type === "INCOME" ? "Shows in the Transactions form when Income is picked." : "Shows in the Transactions form when Expense is picked.")}</span>}
      >
        <Input id="cat-name" size="md" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("e.g. Mobile & Internet")} maxLength={60} autoFocus />
      </Field>
    </IEDialog>
  );
}
