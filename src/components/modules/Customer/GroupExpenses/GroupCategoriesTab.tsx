"use client";

import { GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { reorderGroupExpenseCategoriesAction } from "@/lib/customer/groupExpensesActions";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { categoryRows } from "@/lib/customer/groupFamily";
import { formatCount } from "@/lib/i18n/digits";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SmallSwitch } from "../Settings/boardUi";
import { CategoryTile } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

type Filter = "ACTIVE" | "HIDDEN" | "ALL";

// #, category, status, drag handle, actions.
const COLUMNS = "md:grid-cols-[48px_minmax(0,1fr)_200px_40px_84px]";

interface GroupCategoriesTabProps {
  data: GroupPageData;
  onAdd: () => void;
  onEdit: (category: GroupExpenseCategoryOption) => void;
  onHide: (category: GroupExpenseCategoryOption, hidden: boolean) => void;
  onDelete: (category: GroupExpenseCategoryOption) => void;
}

// What the family spends on (the v16 FamilyCategories board), in the
// group's own order, with what the period spent in each. Inactive (hidden)
// categories stay in old records and aren't offered for new expenses; one
// with expenses can only be made inactive, never deleted.
export function GroupCategoriesTab({ data, onAdd, onEdit, onHide, onDelete }: GroupCategoriesTabProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [isMoving, startMoving] = useTransition();
  // The order being dragged into shape: ids, saved on drop.
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const isAdmin = data.role === "OWNER";
  const label = monthName(data.range.key, fmt, "long", true);
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const spending = new Map(categoryRows(data.expenses, data.categories).map((row) => [row.name, row]));
  const counts: Record<Filter, number> = { ACTIVE: data.categories.filter((c) => !c.hidden).length, HIDDEN: data.categories.filter((c) => c.hidden).length, ALL: data.categories.length };
  const words = query.trim().toLowerCase();
  const rows = data.categories
    .filter((c) => (filter === "ALL" ? true : filter === "HIDDEN" ? !!c.hidden : !c.hidden))
    .filter((c) => !words || c.name.toLowerCase().includes(words))
    .map((option) => ({ option, spent: spending.get(option.name)?.amount ?? 0, count: spending.get(option.name)?.count ?? 0, share: spending.get(option.name)?.share ?? 0 }))
    .sort((a, b) => a.option.displayOrder - b.option.displayOrder);
  // The whole list in the group's order can be reordered (not a filtered one).
  const canDrag = isAdmin && filter === "ALL" && !words;
  const sorted = order ? order.flatMap((id) => rows.filter((row) => row.option.id === id)) : rows;
  // While dragging, the dragged row takes the place of the one under it.
  function moveTo(dragged: string, over: string) {
    if (!order) return;
    const ids = order.filter((id) => id !== dragged);
    const at = ids.indexOf(over);
    const before = order.indexOf(dragged) > order.indexOf(over);
    ids.splice(before ? at : at + 1, 0, dragged);
    if (ids.join() !== order.join()) setOrder(ids);
  }
  function save(ids: string[]) {
    setOrder(ids);
    startMoving(async () => {
      const result = await attempt(() => reorderGroupExpenseCategoriesAction(data.businessId, ids), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to reorder the categories"));
        setOrder(null);
        return;
      }
      router.refresh();
      setOrder(null);
    });
  }
  function finishDrag() {
    const ids = order;
    setDragging(null);
    if (!ids) return;
    if (ids.join() === rows.map((row) => row.option.id).join()) return setOrder(null);
    save(ids);
  }
  const activeSpent = data.categories.filter((c) => !c.hidden).reduce((sum, c) => sum + (spending.get(c.name)?.amount ?? 0), 0);
  const filterWord = filter === "ACTIVE" ? t("active") : filter === "HIDDEN" ? t("inactive") : t("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Categories")}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={onAdd}>
            <Plus aria-hidden="true" />
            {t("Add category")}
          </Button>
        </div>
      </div>
      <ListCard
        label={t("Categories")}
        header={
          <div className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:gap-4 md:px-5">
            <SegmentedControl
              label={t("Status")}
              variant="tabs"
              className="rounded-full p-1"
              value={filter}
              onChange={setFilter}
              options={(["ALL", "ACTIVE", "HIDDEN"] as Filter[]).map((value) => ({
                value,
                label: (
                  <>
                    {t(value === "ACTIVE" ? "Active" : value === "HIDDEN" ? "Inactive" : "All")} <span className="font-normal text-ink-faint">{formatCount(counts[value], fmt)}</span>
                  </>
                ),
              }))}
            />
            <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search category…")} aria-label={t("Search categories")} frameClassName="min-w-0 flex-1 md:max-w-140 md:flex-none md:w-140" />
          </div>
        }
        footer={
          <ListFooter className="bg-hover text-[13px] text-ink-soft md:px-5">
            <span>{t("{count} active categories · {amount} spent in {month}", { count: formatCount(counts.ACTIVE, fmt), amount: money(activeSpent), month: label })}</span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell>{t("Status")}</ListHeadCell>
          <ListHeadCell>
            <span className="sr-only">{t("Order")}</span>
          </ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={words ? t("No category matches \"{query}\".", { query: query.trim() }) : t("No {filter} categories.", { filter: filterWord })} />}
        {sorted.map(({ option, count }, index) => {
          const uses = option.expenseCount ?? count;
          const sub = option.hidden ? t("Not shown for new expenses") : uses > 0 ? t(uses === 1 ? "Used in {count} expense so far" : "Used in {count} expenses so far", { count: formatCount(uses, fmt) }) : t("Not used yet");
          return (
            <ListRow
              key={option.id}
              columns={COLUMNS}
              className={cn("min-h-15 grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 tabular-nums md:px-5 md:py-1.5", dragging === option.id && "bg-emerald-wash opacity-80")}
              onDragOver={(event) => {
                if (!dragging || dragging === option.id) return;
                event.preventDefault();
                moveTo(dragging, option.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                finishDrag();
              }}
            >
              <ListCell className="hidden text-center text-ink-muted md:block">{formatCount(index + 1, fmt)}</ListCell>
              <ListCell className={cn("flex items-center gap-3", option.hidden && "opacity-60")}>
                <CategoryTile name={option.name} categories={data.categories} size={32} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{option.name}</span>
                  <span className="truncate text-caption text-ink-muted">{sub}</span>
                </span>
              </ListCell>
              <ListCell className="hidden md:block">
                <span className={cn("inline-flex h-8 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5", option.hidden ? "border-line bg-surface-sunken" : "border-success-line bg-income-soft/50")}>
                  <SmallSwitch on={!option.hidden} label={option.hidden ? t("Make active: {name}", { name: option.name }) : t("Make inactive: {name}", { name: option.name })} title={option.hidden ? t("Inactive: not offered for new expenses. Click to make it active.") : t("Active: offered for new expenses. Click to make it inactive.")} onClick={() => onHide(option, !option.hidden)} />
                  <span className={cn("text-small font-semibold", option.hidden ? "text-ink-muted" : "text-income")}>{option.hidden ? t("Inactive") : t("Active")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden md:flex md:justify-center">
                {canDrag && (
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDragging(option.id);
                      setOrder(sorted.map((row) => row.option.id));
                    }}
                    onDragEnd={finishDrag}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      event.preventDefault();
                      const ids = sorted.map((row) => row.option.id);
                      const at = ids.indexOf(option.id);
                      const to = event.key === "ArrowUp" ? at - 1 : at + 1;
                      if (to < 0 || to >= ids.length) return;
                      [ids[at], ids[to]] = [ids[to], ids[at]];
                      save(ids);
                    }}
                    disabled={isMoving}
                    aria-label={t("Move {name}: drag, or use the arrow keys", { name: option.name })}
                    title={t("Drag to reorder")}
                    className="flex size-8 cursor-grab items-center justify-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink-2 active:cursor-grabbing disabled:opacity-50"
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </button>
                )}
              </ListCell>
              <ListRowActions className="flex items-center justify-end gap-1.5">
                {/* A phone has no Status column: the switch sits with the actions. */}
                <span className="flex md:hidden">
                  <SmallSwitch on={!option.hidden} label={option.hidden ? t("Make active: {name}", { name: option.name }) : t("Make inactive: {name}", { name: option.name })} onClick={() => onHide(option, !option.hidden)} />
                </span>
                <button type="button" onClick={() => onEdit(option)} aria-label={t("Edit {name}", { name: option.name })} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  <Pencil className="size-3.75" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onDelete(option)} aria-label={t("Delete {name}", { name: option.name })} title={uses > 0 ? t("Hide instead of delete") : t("Delete")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                  <Trash2 className="size-3.75" aria-hidden="true" />
                </button>
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
