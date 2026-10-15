"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { GroupExpenseCategoryOption, GroupMonthlyBudget } from "@/lib/customer/api";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CategoryTile } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

interface GroupSettingsTabProps {
  data: GroupPageData;
  onAddBudget: () => void;
  onEditBudget: (budget: GroupMonthlyBudget) => void;
  onAddCategory: () => void;
  onEditCategory: (category: GroupExpenseCategoryOption) => void;
  onRemoveCategory: (category: GroupExpenseCategoryOption) => void;
  onDeleteGroup: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

// A group's settings: its name, the monthly budgets, the expense
// categories, and the one button that deletes it.
export function GroupSettingsTab({ data, onAddBudget, onEditBudget, onAddCategory, onEditCategory, onRemoveCategory, onDeleteGroup }: GroupSettingsTabProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [isPending, startTransition] = useTransition();
  const dirty = name.trim().length > 0 && name.trim() !== data.name;
  const budgets = [...data.budgets].sort((a, b) => b.year - a.year || b.month - a.month);

  function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || isPending) return;
    startTransition(async () => {
      const result = await updateBusinessAction(data.businessId, { name: name.trim() });
      if (result.success) {
        toast.success(t("Group renamed"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to rename the group"));
      }
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Card padding="none" className="flex flex-col gap-4 p-5">
          <h2 className="text-title font-semibold text-ink">{t("General")}</h2>
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <Field htmlFor="gs-name" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>}>
              <Input id="gs-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption font-normal leading-relaxed text-ink-muted">{t("Every cost is shared equally among the active members. Closed months keep their figures.")}</span>
              <Button type="submit" variant="secondary" size="sm" disabled={!dirty || isPending}>
                {isPending && <Loader size={16} />}
                {t("Save name")}
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 className="text-title font-semibold text-ink">{t("Monthly budget")}</h2>
              <span className="text-small text-ink-muted">{t("The group is warned at 90% used and shown in red once over.")}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onAddBudget}>
              <Plus />
              {t("Set budget")}
            </Button>
          </div>
          {budgets.length === 0 && <p className="border-t border-surface-sunken px-5 py-5 text-center text-small text-ink-muted">{t("No budget yet.")}</p>}
          {budgets.map((budget) => (
            <button key={budget.id} type="button" onClick={() => onEditBudget(budget)} className="flex h-12 w-full items-center gap-3 border-t border-surface-sunken px-5 text-left hover:bg-cream">
              <span className="flex-1 text-body font-medium text-ink">{monthName(`${budget.year}-${pad(budget.month)}`, locale, "long", true)}</span>
              <span className="text-body font-semibold text-ink tabular-nums">{formatCurrency(budget.budgetAmount, data.currency)}</span>
              <Pencil className="size-4 text-ink-muted" aria-hidden="true" />
            </button>
          ))}
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex flex-col gap-0.75">
              <h2 className="text-title font-semibold text-ink">{t("Categories")}</h2>
              <span className="text-small text-ink-muted">{t("What an expense can be filed under. Each is shared equally.")}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onAddCategory}>
              <Plus />
              {t("Add")}
            </Button>
          </div>
          {data.categories.length === 0 && <p className="border-t border-surface-sunken px-5 py-5 text-center text-small text-ink-muted">{t("No category yet. Bazar, rent, bills… add the ones this group uses.")}</p>}
          {data.categories.map((category) => (
            <div key={category.id} className="flex h-12 items-center gap-3 border-t border-surface-sunken px-5">
              <CategoryTile name={category.name} categories={data.categories} size={28} />
              <span className="flex-1 truncate text-body font-medium text-ink">{category.name}</span>
              <button type="button" onClick={() => onEditCategory(category)} aria-label={`${t("Edit")} ${category.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-cream hover:text-ink">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onRemoveCategory(category)} aria-label={`${t("Delete")} ${category.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-expense-soft hover:text-expense">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </Card>

        <Card padding="none" className="flex items-center gap-4 border-expense/25 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 className="text-title font-semibold text-expense">{t("Delete this group")}</h2>
            <span className="text-small leading-relaxed text-ink-muted">
              {t("Removes")} {data.name} {t("with every entry and closed month. This can't be undone.")}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onDeleteGroup} className="border-expense/40 text-expense hover:bg-expense-soft">
            {t("Delete group")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
