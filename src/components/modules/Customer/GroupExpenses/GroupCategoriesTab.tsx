"use client";

import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { categoryRows } from "@/lib/customer/groupFamily";
import { type GroupPeriod, periodLabel } from "@/lib/customer/groupPeriod";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryTile, categoryBarClass } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import type { GroupPageData } from "./groupTypes";

type Filter = "ACTIVE" | "HIDDEN" | "ALL";

const PERIODS = ["month", "year", "custom"] as const;
// Category, spent, entries, share of spending, actions.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_150px_96px_170px_84px]";

interface GroupCategoriesTabProps {
  data: GroupPageData;
  onPeriod: (period: GroupPeriod) => void;
  onAdd: () => void;
  onEdit: (category: GroupExpenseCategoryOption) => void;
  onHide: (category: GroupExpenseCategoryOption, hidden: boolean) => void;
  onDelete: (category: GroupExpenseCategoryOption) => void;
  busy: boolean;
}

// What the family spends on (the v7 FamilyCategories board), by what the
// period spent in each. A category with expenses can only be hidden: it
// stays in old records and isn't offered for new ones.
export function GroupCategoriesTab({ data, onPeriod, onAdd, onEdit, onHide, onDelete, busy }: GroupCategoriesTabProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [query, setQuery] = useState("");
  const period = data.period ?? { kind: "month" };
  const label = periodLabel(period, data.today, data.startDay, t, fmt);
  const money = (value: number) => formatCurrency(value, data.currency, fmt);
  const spending = new Map(categoryRows(data.periodExpenses ?? data.expenses, data.categories).map((row) => [row.name, row]));
  const counts: Record<Filter, number> = { ACTIVE: data.categories.filter((c) => !c.hidden).length, HIDDEN: data.categories.filter((c) => c.hidden).length, ALL: data.categories.length };
  const words = query.trim().toLowerCase();
  const rows = data.categories
    .filter((c) => (filter === "ALL" ? true : filter === "HIDDEN" ? !!c.hidden : !c.hidden))
    .filter((c) => !words || c.name.toLowerCase().includes(words))
    .map((option) => ({ option, spent: spending.get(option.name)?.amount ?? 0, count: spending.get(option.name)?.count ?? 0, share: spending.get(option.name)?.share ?? 0 }))
    .sort((a, b) => b.spent - a.spent || a.option.displayOrder - b.option.displayOrder);
  const activeSpent = data.categories.filter((c) => !c.hidden).reduce((sum, c) => sum + (spending.get(c.name)?.amount ?? 0), 0);
  const filterWord = filter === "ACTIVE" ? t("active") : filter === "HIDDEN" ? t("hidden") : t("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={data.startDay} onChange={onPeriod} busy={busy} />
      </div>
      <ListCard
        label={t("Categories")}
        header={
          <div className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-5">
            <SegmentedControl
              label={t("Status")}
              variant="tabs"
              className="rounded-full p-1"
              value={filter}
              onChange={setFilter}
              options={(["ACTIVE", "HIDDEN", "ALL"] as Filter[]).map((value) => ({
                value,
                label: (
                  <>
                    {t(value === "ACTIVE" ? "Active" : value === "HIDDEN" ? "Hidden" : "All")} <span className="font-normal text-ink-faint">{formatCount(counts[value], fmt)}</span>
                  </>
                ),
              }))}
            />
            <div className="flex gap-2.5">
              <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search category…")} aria-label={t("Search categories")} frameClassName="min-w-0 flex-1 md:w-60 md:flex-none" />
              <Button size="sm" onClick={onAdd} className="h-9.5">
                <Plus />
                {t("Add category")}
              </Button>
            </div>
          </div>
        }
        footer={
          <ListFooter className="flex-col items-start gap-1 text-small text-ink-soft md:px-5">
            <span className="font-semibold text-ink-2">{t("{count} active categories · {amount} spent · {period}", { count: formatCount(counts.ACTIVE, fmt), amount: money(activeSpent), period: label })}</span>
            <span>{t("A category with expenses can't be deleted, only hidden. Hidden ones stay in old records.")}</span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell align="end">{t("Spent · {period}", { period: label })}</ListHeadCell>
          <ListHeadCell align="end">{t("Entries")}</ListHeadCell>
          <ListHeadCell>{t("Share of spending")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={words ? t("No category matches \"{query}\".", { query: query.trim() }) : t("No {filter} categories.", { filter: filterWord })} />}
        {rows.map(({ option, spent, count, share }) => {
          const used = (option.expenseCount ?? count) > 0;
          const sub = option.hidden ? t("Hidden · not offered in new expenses") : used ? t("Used in expenses") : t("Not used yet");
          return (
            <ListRow key={option.id} columns={COLUMNS} className={cn("min-h-13 grid-cols-[minmax(0,1fr)_auto_84px] gap-x-3 tabular-nums md:px-5 md:py-1.5", option.hidden && "opacity-55")}>
              <ListCell className="flex items-center gap-3">
                <CategoryTile name={option.name} categories={data.categories} size={32} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{option.name}</span>
                  <span className="truncate text-caption text-ink-muted">{sub}</span>
                </span>
              </ListCell>
              <ListCell align="end" className="font-semibold text-ink">
                {money(spent)}
              </ListCell>
              <ListCell align="end" className="hidden text-ink-2 md:block">
                {formatCount(count, fmt)}
              </ListCell>
              <ListCell className="hidden items-center gap-2.5 md:flex">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full bg-current", categoryBarClass(option.name, data.categories))} style={{ width: `${Math.min(100, share)}%` }} />
                </span>
                <span className="w-10 text-right text-caption text-ink-2">{formatCount(Math.round(share), fmt)}%</span>
              </ListCell>
              <ListRowActions className="flex justify-end gap-0.5">
                <button type="button" onClick={() => onEdit(option)} aria-label={t("Edit {name}", { name: option.name })} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                {option.hidden ? (
                  <button type="button" onClick={() => onHide(option, false)} aria-label={t("Show again {name}", { name: option.name })} title={t("Show again")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                    <Eye className="size-4" aria-hidden="true" />
                  </button>
                ) : used ? (
                  <button type="button" onClick={() => onHide(option, true)} aria-label={t("Hide {name}", { name: option.name })} title={t("Hide")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                    <EyeOff className="size-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button type="button" onClick={() => onDelete(option)} aria-label={t("Delete {name}", { name: option.name })} title={t("Delete")} className="flex size-8 items-center justify-center rounded-full text-expense hover:bg-expense-soft pointer-coarse:size-11">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
