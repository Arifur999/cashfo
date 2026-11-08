"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { SmallSwitch } from "../Settings/boardUi";
import { CategoryTile, categoryBarClass } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import type { GroupPageData } from "./groupTypes";

type Filter = "ACTIVE" | "HIDDEN" | "ALL";

const PERIODS = ["month", "year", "custom"] as const;
// #, category, spent, share of spending, status, actions.
const COLUMNS = "md:grid-cols-[28px_minmax(0,1fr)_130px_160px_136px_84px]";

interface GroupCategoriesTabProps {
  data: GroupPageData;
  onPeriod: (period: GroupPeriod) => void;
  // Changing categories is the Admin's: absent for everyone else.
  onAdd?: () => void;
  onEdit?: (category: GroupExpenseCategoryOption) => void;
  onHide?: (category: GroupExpenseCategoryOption, hidden: boolean) => void;
  onDelete?: (category: GroupExpenseCategoryOption) => void;
  busy: boolean;
}

// What the family spends on (the v16 FamilyCategories board), in the
// group's own order, with what the period spent in each. Inactive (hidden)
// categories stay in old records and aren't offered for new expenses; one
// with expenses can only be made inactive, never deleted.
export function GroupCategoriesTab({ data, onPeriod, onAdd, onEdit, onHide, onDelete, busy }: GroupCategoriesTabProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<Filter>("ALL");
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
    .sort((a, b) => a.option.displayOrder - b.option.displayOrder);
  const activeSpent = data.categories.filter((c) => !c.hidden).reduce((sum, c) => sum + (spending.get(c.name)?.amount ?? 0), 0);
  const filterWord = filter === "ACTIVE" ? t("active") : filter === "HIDDEN" ? t("inactive") : t("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Categories")}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={data.startDay} onChange={onPeriod} busy={busy} />
          {onAdd && (
            <Button onClick={onAdd}>
              <Plus aria-hidden="true" />
              {t("Add category")}
            </Button>
          )}
        </div>
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
              options={(["ALL", "ACTIVE", "HIDDEN"] as Filter[]).map((value) => ({
                value,
                label: (
                  <>
                    {t(value === "ACTIVE" ? "Active" : value === "HIDDEN" ? "Inactive" : "All")} <span className="font-normal text-ink-faint">{formatCount(counts[value], fmt)}</span>
                  </>
                ),
              }))}
            />
            <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search category…")} aria-label={t("Search categories")} frameClassName="min-w-0 flex-1 md:max-w-140" />
          </div>
        }
        footer={
          <ListFooter className="flex-col items-start gap-1 text-small text-ink-soft md:px-5">
            <span className="font-semibold text-ink-2">{t("{count} active categories · {amount} spent · {period}", { count: formatCount(counts.ACTIVE, fmt), amount: money(activeSpent), period: label })}</span>
            <span>{t("A category with expenses can’t be deleted. Make it inactive: old entries keep it, new ones won’t offer it.")}</span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell align="end">{t("Spent · {period}", { period: label })}</ListHeadCell>
          <ListHeadCell>{t("Share of spending")}</ListHeadCell>
          <ListHeadCell>{t("Status")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={words ? t("No category matches \"{query}\".", { query: query.trim() }) : t("No {filter} categories.", { filter: filterWord })} />}
        {rows.map(({ option, spent, count, share }, index) => {
          const uses = option.expenseCount ?? count;
          const sub = option.hidden ? t("Not shown for new expenses") : uses > 0 ? t(uses === 1 ? "Used in {count} expense so far" : "Used in {count} expenses so far", { count: formatCount(uses, fmt) }) : t("Not used yet");
          return (
            <ListRow key={option.id} columns={COLUMNS} className="min-h-15 grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 tabular-nums md:px-5 md:py-1.5">
              <ListCell className="hidden text-center text-ink-muted md:block">{formatCount(index + 1, fmt)}</ListCell>
              <ListCell className={cn("flex items-center gap-3", option.hidden && "opacity-60")}>
                <CategoryTile name={option.name} categories={data.categories} size={32} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{option.name}</span>
                  <span className="truncate text-caption text-ink-muted">{sub}</span>
                </span>
              </ListCell>
              <ListCell align="end" className="font-semibold text-ink">
                {money(spent)}
              </ListCell>
              <ListCell className="hidden items-center gap-2.5 md:flex">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full bg-current", categoryBarClass(option.name, data.categories))} style={{ width: `${Math.min(100, share)}%` }} />
                </span>
                <span className="w-10 text-right text-caption text-ink-2">{formatCount(Math.round(share), fmt)}%</span>
              </ListCell>
              <ListCell className="hidden md:block">
                <span className={cn("inline-flex h-8 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5", option.hidden ? "border-line bg-surface-sunken" : "border-success-line bg-income-soft/50")}>
                  {onHide && <SmallSwitch on={!option.hidden} label={option.hidden ? t("Make active: {name}", { name: option.name }) : t("Make inactive: {name}", { name: option.name })} title={option.hidden ? t("Inactive: not offered for new expenses. Click to make it active.") : t("Active: offered for new expenses. Click to make it inactive.")} onClick={() => onHide(option, !option.hidden)} />}
                  <span className={cn("text-small font-semibold", option.hidden ? "text-ink-muted" : "text-income")}>{option.hidden ? t("Inactive") : t("Active")}</span>
                </span>
              </ListCell>
              {onHide && onEdit && onDelete && (
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
              )}
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
