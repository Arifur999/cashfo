"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { reorderCategoriesAction, setCategoryActiveAction } from "@/app/(dashboardLayout)/admin/content/categories/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { changedOrder, moveItem } from "@/lib/reorder";
import { categoriesQuery } from "@/queries/category.queries";
import type { CategoryDirection, ICategory } from "@/types/category.types";
import { toCategoryFormValues } from "./categoryForm.defaults";
import CategoryForm from "./CategoryForm";
import CategoryRow from "./CategoryRow";
import CreateCategoryDialog from "./CreateCategoryDialog";
import T from "@/components/shared/T";

const NO_CATEGORIES: ICategory[] = [];

// The design's "Starting categories": expense or income, each category with
// a handle to drag it into place, its Bangla name, where its money goes,
// and a switch that says whether new workspaces still get it. A name opens
// the editor.
const CategoriesPanel = ({ canManage }: { canManage: boolean }) => {
  const query = useQuery(categoriesQuery());
  const categories = query.data?.data ?? NO_CATEGORIES;
  const [direction, setDirection] = useState<CategoryDirection>("EXPENSE");
  const { locale, translate } = useLocale();
  const { activeRow: category, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICategory, "edit">();

  const { run: setActive } = useActionMutation({
    action: ({ id, isActive }: { id: string; isActive: boolean }) => setCategoryActiveAction(id, isActive),
    successMessage: (updated) => translate(updated.isActive ? "{name} is back for new accounts" : "{name} no longer goes to new accounts", { name: updated.name }),
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });

  const sorted = categories.filter((item) => item.type === direction).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const total = (type: CategoryDirection) => categories.filter((item) => item.type === type).length;

  // A move shows at once; the new places are saved, and the list settles
  // on what comes back. Moves are worked out from the list on screen, with
  // the places already sent, so a second move before the first one lands
  // builds on it instead of undoing it.
  const [shown, setShown] = useOptimistic(sorted);
  const [, startTransition] = useTransition();
  const [dragged, setDragged] = useState<string | null>(null);
  const { run: saveOrder } = useActionMutation({
    action: reorderCategoriesAction,
    successMessage: "New order saved",
    invalidateKeys: [queryKeys.categories.all],
    refreshRoute: false,
  });
  const reorder = (from: string, to: string | undefined) => {
    if (!to) return;
    const moved = moveItem(shown, from, to);
    const orders = changedOrder(moved);
    if (orders.length === 0) return;
    const next = moved.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    startTransition(async () => {
      setShown(next);
      await saveOrder(orders);
    });
  };
  const drop = (targetId: string) => {
    if (dragged) reorder(dragged, targetId);
    setDragged(null);
  };

  const count = (label: string, n: number) => (
    <>
      <T>{label}</T>
      <span className="font-normal text-ink-muted">{formatCount(n, locale)}</span>
    </>
  );

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4.5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink"><T>Starting categories</T></h2>
          <span className="text-[12.5px] leading-[normal] text-ink-muted"><T>Every new account gets these. People can change their own later.</T></span>
        </div>
        {canManage && (
          <CreateCategoryDialog
            direction={direction}
            trigger={
              <Button variant="secondary" size="sm" className="h-8.5 px-3.5 pointer-coarse:h-11">
                <Plus aria-hidden="true" />
                <T>Add</T>
              </Button>
            }
          />
        )}
      </div>
      {query.isError && !query.data ? (
        // An outage isn't "no categories yet": say they didn't load.
        <ErrorState
          bordered={false}
          className="border-t border-divider"
          title={translate("Couldn't load the categories")}
          description={translate("Try again in a moment.")}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <SegmentedControl
            label="Direction"
            variant="pill"
            size="coarse"
            className="mx-4.5 mb-2.5 self-start rounded-[9px]"
            options={[
              { value: "EXPENSE" as const, label: count("Expense", total("EXPENSE")) },
              { value: "INCOME" as const, label: count("Income", total("INCOME")) },
            ]}
            value={direction}
            onChange={setDirection}
          />
          {query.data && shown.length === 0 && (
            <p className="border-t border-divider px-5 py-4 text-small text-ink-muted">{translate(direction === "EXPENSE" ? "No expense categories yet." : "No income categories yet.")}</p>
          )}
          {shown.map((item, index) => (
            <CategoryRow
              key={item.id}
              category={item}
              canManage={canManage}
              isFirst={index === 0}
              isLast={index === shown.length - 1}
              isDragged={dragged === item.id}
              onEdit={() => openDialog("edit", item)}
              onSetActive={(isActive) => setActive({ id: item.id, isActive })}
              onMove={(to) => reorder(item.id, shown[to === "up" ? index - 1 : index + 1]?.id)}
              onDragStart={() => setDragged(item.id)}
              onDragEnd={() => setDragged(null)}
              onDrop={() => drop(item.id)}
            />
          ))}
        </>
      )}
      <FormDialog title={category ? translate("Edit {name}", { name: category.name }) : "Edit category"} {...getDialogProps("edit")}>
        {category && <CategoryForm category={category} defaultValues={toCategoryFormValues(category)} onDone={closeDialog} />}
      </FormDialog>
    </Card>
  );
};

export default CategoriesPanel;
