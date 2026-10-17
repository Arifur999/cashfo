"use client";

import { useQuery } from "@tanstack/react-query";
import { GripVertical, Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { reorderCategoriesAction, setCategoryActiveAction } from "@/app/(dashboardLayout)/admin/content/categories/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Card from "@/components/smartly/Card";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localName, type Translate } from "@/lib/i18n/message";
import { formatNumber } from "@/lib/number";
import { queryKeys } from "@/lib/queryKeys";
import { changedOrder, moveItem } from "@/lib/reorder";
import { cn } from "@/lib/utils";
import { categoriesQuery } from "@/queries/category.queries";
import type { CategoryDirection, ICategory } from "@/types/category.types";
import { toCategoryFormValues } from "./categoryForm.defaults";
import CategoryForm from "./CategoryForm";
import CreateCategoryDialog from "./CreateCategoryDialog";
import T from "@/components/shared/T";

const count = (label: string, n: number) => (
  <>
    <T>{label}</T>
    <span className="font-normal text-ink-muted">{formatNumber(n)}</span>
  </>
);

// "Paid from Cash" for an expense, "Goes to Bank" for income.
const linkText = (category: ICategory, t: Translate, locale: "en" | "bn") =>
  category.linkedAccountTemplate
    ? t(category.type === "EXPENSE" ? "Paid from {name}" : "Goes to {name}", { name: localName(locale, category.linkedAccountTemplate) })
    : t("No account yet");

// The design's "Starting categories": expense or income, each category with
// a handle to drag it into place, its Bangla name, where its money goes,
// and a switch that says whether new workspaces still get it. A name opens
// the editor.
const CategoriesPanel = ({ canManage }: { canManage: boolean }) => {
  const categories = useQuery(categoriesQuery()).data?.data ?? [];
  const [direction, setDirection] = useState<CategoryDirection>("EXPENSE");
  const { locale, translate } = useLocale();
  const { activeRow: category, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICategory, "edit">();

  const { run: setActive } = useActionMutation({
    action: ({ id, isActive }: { id: string; isActive: boolean }) => setCategoryActiveAction(id, isActive),
    successMessage: (updated) => translate(updated.isActive ? "{name} is back for new workspaces" : "{name} no longer goes to new workspaces", { name: updated.name }),
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });

  const sorted = categories.filter((item) => item.type === direction).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const total = (type: CategoryDirection) => categories.filter((item) => item.type === type).length;

  // Dragging a row onto another moves it there at once; the new places are
  // saved, and the list settles on what comes back.
  const [shown, setShown] = useOptimistic(sorted);
  const [, startTransition] = useTransition();
  const [dragged, setDragged] = useState<string | null>(null);
  const { run: saveOrder } = useActionMutation({
    action: reorderCategoriesAction,
    successMessage: "New order saved",
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });
  const drop = (targetId: string) => {
    if (!dragged) return;
    const next = moveItem(sorted, dragged, targetId);
    setDragged(null);
    const orders = changedOrder(next);
    if (orders.length === 0) return;
    startTransition(async () => {
      setShown(next);
      await saveOrder(orders);
    });
  };

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink"><T>Starting categories</T></h2>
          <span className="text-small text-ink-muted"><T>Every new workspace gets these. People can change their own later.</T></span>
        </div>
        {canManage && (
          <CreateCategoryDialog
            direction={direction}
            trigger={
              <Button variant="outline" size="sm" className="h-8.5 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream">
                <Plus aria-hidden="true" />
                <T>Add</T>
              </Button>
            }
          />
        )}
      </div>
      <SegmentedControl
        label="Direction"
        variant="tabs"
        className="mx-4 mb-3"
        options={[
          { value: "EXPENSE" as const, label: count("Expense", total("EXPENSE")) },
          { value: "INCOME" as const, label: count("Income", total("INCOME")) },
        ]}
        value={direction}
        onChange={setDirection}
      />
      {shown.length === 0 && (
        <p className="border-t border-surface-sunken px-5 py-4 text-small text-ink-muted">{translate(direction === "EXPENSE" ? "No expense categories yet." : "No income categories yet.")}</p>
      )}
      {shown.map((item) => (
        <div
          key={item.id}
          draggable={canManage}
          onDragStart={() => setDragged(item.id)}
          onDragEnd={() => setDragged(null)}
          onDragOver={canManage ? (event) => event.preventDefault() : undefined}
          onDrop={canManage ? () => drop(item.id) : undefined}
          className={cn("flex min-h-14 items-center gap-3 border-t border-surface-sunken px-5 py-2 text-body", dragged === item.id && "opacity-50")}
        >
          {canManage && <GripVertical className="size-4 shrink-0 cursor-grab text-ink-faint" aria-hidden="true" />}
          <button
            type="button"
            onClick={canManage ? () => openDialog("edit", item) : undefined}
            disabled={!canManage}
            className={cn("flex min-w-0 grow flex-col text-left", canManage && "hover:text-emerald")}
          >
            <span className={cn("truncate font-medium", item.isActive ? "text-ink" : "text-ink-muted")}>{item.name}</span>
            <span lang="bn" className="truncate text-small text-ink-muted">
              {item.nameBn}
            </span>
          </button>
          <span className="shrink-0 text-caption text-ink-muted">{linkText(item, translate, locale)}</span>
          <Switch
            checked={item.isActive}
            disabled={!canManage}
            onCheckedChange={(checked) => void setActive({ id: item.id, isActive: checked })}
            aria-label={translate("Use {name}", { name: item.name })}
            className="data-checked:bg-emerald data-unchecked:bg-line-strong"
          />
        </div>
      ))}
      <FormDialog title={category ? translate("Edit {name}", { name: category.name }) : "Edit category"} {...getDialogProps("edit")}>
        {category && <CategoryForm category={category} defaultValues={toCategoryFormValues(category)} onDone={closeDialog} />}
      </FormDialog>
    </Card>
  );
};

export default CategoriesPanel;
