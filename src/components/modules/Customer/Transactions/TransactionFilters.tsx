"use client";

import { ChevronDown, Filter, Printer, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { listPeriodHref } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { PeriodPicker, periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ActiveMonth } from "@/lib/customer/api";
import { ieCategoryInk } from "@/lib/customer/categoryTone";
import { type PickedPeriod, samePeriod, type YearMonth } from "@/lib/customer/period";
import { activeFilterCount, categoryLabel, readTransactionFilters } from "@/lib/customer/transactionRows";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type TypeFilter = "" | "INCOME" | "EXPENSE";

export interface FilterCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  // Its colour name (ieCategoryInk), for the dot in the menu.
  color?: string | null;
}

interface TransactionFiltersProps {
  categories: FilterCategory[];
  // How many transactions each category has in the period, by type; the
  // money with no category under "".
  counts: Record<"INCOME" | "EXPENSE", Record<string, number>>;
  period: PickedPeriod;
  current: YearMonth;
  today: string;
  activeMonths: ActiveMonth[] | null;
  // Runs a URL change in the page's transition, so the list dims while
  // the next one loads.
  navigate: (href: string, mode?: "push" | "replace") => void;
  // The query a change builds on: the one last asked for while it loads,
  // else the URL on show (which useSearchParams keeps until it lands).
  baseQuery: () => URLSearchParams;
  // Print the statement of what the filters show; absent while there is
  // nothing to print.
  onPrint?: () => void;
  printing?: boolean;
}

// The type pill's 44px segments on the bar (the Transactions board).
// TransactionsDark: the chosen type is lifted without a ring in dark too.
const BAR_SEGMENTS = "[&>button]:h-11 [&>button]:gap-1.5 [&>button]:px-4 [&>button]:text-body dark:[&>button]:shadow-none";
// The category select's value for the money with no category.
// (a leading space: no category name can start with one, they are trimmed).
const NO_CATEGORY = " none";
// How long the search waits after the last key before it asks.
const SEARCH_WAIT_MS = 350;

type MenuEntry = { kind: "head"; label: string } | { kind: "item"; value: string; label: string; dot: string; count?: number; selected: boolean };

// One of the bar's dropdowns (the board's category menu): a 44px button
// with the choice on show, outlined in emerald while it narrows the list,
// opening a 260px list in groups, each choice with its dot and how many it
function FilterMenu({ label, buttonLabel, buttonDot, active, entries, onPick }: { label: string; buttonLabel: string; buttonDot: string | null; active: boolean; entries: MenuEntry[]; onPick: (value: string) => void }) {
  const { fmt } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-label={`${label}: ${buttonLabel}`}
          className={cn("flex h-11 max-w-55 shrink-0 items-center gap-2 rounded-field border bg-surface px-3.5 text-body font-medium whitespace-nowrap text-ink transition-colors hover:border-line-strong", active || open ? "border-emerald" : "border-input")}
        >
          {buttonDot && <span aria-hidden="true" className={cn("size-2.25 shrink-0 rounded-full bg-current", buttonDot)} />}
          <span className="min-w-0 truncate">{buttonLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-65 gap-0 rounded-[14px] border border-line bg-surface p-1.5 shadow-float ring-0">
        <div role="listbox" aria-label={label} className="flex max-h-105 flex-col overflow-y-auto">
          {entries.map((entry, index) =>
            entry.kind === "head" ? (
              <span key={`head-${index}`} role="presentation" className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                {entry.label}
              </span>
            ) : (
              <button
                key={`item-${entry.value}`}
                type="button"
                role="option"
                aria-selected={entry.selected}
                onClick={() => {
                  setOpen(false);
                  onPick(entry.value);
                }}
                className={cn("flex min-h-10 shrink-0 items-center gap-2.5 rounded-sm px-2.5 text-left text-body text-ink", entry.selected ? "bg-emerald-soft font-semibold" : "hover:bg-surface-sunken")}
              >
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", entry.dot)} />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.count !== undefined && <span className="shrink-0 text-caption font-normal text-ink-muted tabular-nums">{formatCount(entry.count, fmt)}</span>}
              </button>
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// The filters on Transactions (the board's bar): a search over the
// description, category, account and amount, asked as you type; the type;
// the category, with how many each has in the period; the period; and
// Print. All kept in the URL, so a filtered list can be shared
// and comes back on refresh. On phones the search stays and the rest opens
// in a sheet; chips show what is on, and each one takes its filter off.
export function TransactionFilters({ categories, counts, period, current, today, activeMonths, navigate, baseQuery, onPrint, printing = false }: TransactionFiltersProps) {
  const { t, fmt } = useLocale();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const filters = readTransactionFilters((key) => searchParams.get(key));
  const type: TypeFilter = filters.type ?? "";
  const categoryValue = filters.uncategorised ? NO_CATEGORY : (filters.categoryId ?? "");
  const thisMonth: PickedPeriod = { kind: "month", ...current };
  const otherPeriod = !samePeriod(period, thisMonth);
  const activeCount = activeFilterCount({ ...filters, dateFrom: undefined, dateTo: undefined }) + (otherPeriod ? 1 : 0);

  // The search box follows the URL (Back, a chip), and keeps what is being
  // typed: while a search this box sent is on its way, the URL landing
  // doesn't overwrite the letters typed since.
  const urlSearch = filters.search ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [shownSearch, setShownSearch] = useState(urlSearch);
  const [sentSearch, setSentSearch] = useState<string | null>(null);
  if (urlSearch !== shownSearch) {
    setShownSearch(urlSearch);
    if (sentSearch === null) setSearch(urlSearch);
    else if (urlSearch === sentSearch) setSentSearch(null);
  }
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  function update(changes: Record<string, string | undefined>, mode: "push" | "replace" = "push") {
    const next = baseQuery();
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const query = next.toString();
    navigate(query ? `/transactions?${query}` : "/transactions", mode);
  }

  // Sends the search unless it is the one already asked for. Typing
  // replaces the history entry rather than adding one per pause.
  function sendSearch(value: string, mode: "push" | "replace") {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = value.trim();
    if (trimmed === (baseQuery().get("search") ?? "")) return;
    setSentSearch(trimmed);
    update({ search: trimmed || undefined }, mode);
  }

  function typeSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => sendSearch(value, "replace"), SEARCH_WAIT_MS);
  }

  function pickPeriod(next: PickedPeriod) {
    navigate(listPeriodHref("/transactions", Object.fromEntries(baseQuery()), next, current));
  }

  function pickType(next: TypeFilter) {
    const changes: Record<string, string | undefined> = { type: next || undefined };
    // A category only the other side has can't match the new type. One the
    // list doesn't know (a deleted category's) stays. The category is the
    // one last picked, which may still be loading.
    const base = baseQuery();
    const picked = readTransactionFilters((key) => base.get(key)).categoryId;
    if (next && picked) {
      const other = next === "INCOME" ? "EXPENSE" : "INCOME";
      const ours = categories.some((c) => c.type === next && c.name === picked);
      if (!ours && categories.some((c) => c.type === other && c.name === picked)) changes.categoryId = undefined;
    }
    update(changes);
  }

  function pickCategory(value: string) {
    if (value === NO_CATEGORY) update({ categoryId: undefined, uncategorised: "1" });
    else update({ categoryId: value || undefined, uncategorised: undefined });
  }

  function clearAll() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearch("");
    setSentSearch(null);
    navigate("/transactions");
  }

  const typeOptions = [
    { value: "" as TypeFilter, label: t("All") },
    { value: "INCOME" as TypeFilter, label: t("Income"), dot: "var(--success)" },
    { value: "EXPENSE" as TypeFilter, label: t("Expense"), dot: "var(--expense-fill)" },
  ];

  // Income and expense categories in their own groups, only the chosen
  // type's when one is chosen, each with how many it has in the period. A
  // category in the URL the list doesn't know (a deleted one, "Asset Sale")
  // still shows as picked.
  const sides = (["INCOME", "EXPENSE"] as const).filter((side) => !type || side === type);
  const countOf = (side: "INCOME" | "EXPENSE", name: string) => counts[side][name] ?? 0;
  const noCategory = sides.reduce((sum, side) => sum + countOf(side, ""), 0);
  const knownCategory = !filters.categoryId || categories.some((c) => c.name === filters.categoryId && sides.includes(c.type));
  const withCount = (label: string, count: number) => `${label} · ${formatCount(count, fmt)}`;
  const pickedCategory = filters.categoryId ? categories.find((c) => c.name === filters.categoryId && sides.includes(c.type)) : undefined;

  // The bar's category menu (the board's): All categories, then each side's.
  const categoryEntries: MenuEntry[] = [{ kind: "item", value: "", label: t("All categories"), dot: "text-line-strong", selected: categoryValue === "" }];
  if (!knownCategory && filters.categoryId) categoryEntries.push({ kind: "item", value: filters.categoryId, label: categoryLabel(filters.categoryId, t), dot: "text-ink-faint", selected: true });
  for (const side of sides) {
    const list = categories.filter((c) => c.type === side);
    if (list.length === 0) continue;
    categoryEntries.push({ kind: "head", label: t(side === "INCOME" ? "Income" : "Expense") });
    for (const category of list) {
      categoryEntries.push({ kind: "item", value: category.name, label: categoryLabel(category.name, t), dot: ieCategoryInk(category.color), count: countOf(side, category.name), selected: categoryValue === category.name });
    }
  }
  if (noCategory > 0 || filters.uncategorised) categoryEntries.push({ kind: "item", value: NO_CATEGORY, label: t("Uncategorised"), dot: "text-ink-faint", count: noCategory, selected: !!filters.uncategorised });
  const categoryButton = filters.uncategorised ? t("Uncategorised") : filters.categoryId ? categoryLabel(filters.categoryId, t) : t("All categories");
  const categoryDot = filters.uncategorised ? "text-ink-faint" : pickedCategory ? ieCategoryInk(pickedCategory.color) : null;

  // In the phone sheet the category is a plain select filling the row.
  const selects = (
    <NativeSelect size="sm" value={categoryValue} onChange={(event) => pickCategory(event.target.value)} aria-label={t("Category")} className="font-medium">
      <option value="">{t("All categories")}</option>
      {!knownCategory && filters.categoryId && <option value={filters.categoryId}>{categoryLabel(filters.categoryId, t)}</option>}
      {sides.map((side) => {
        const list = categories.filter((c) => c.type === side);
        return (
          list.length > 0 && (
            <optgroup key={side} label={t(side === "INCOME" ? "Income categories" : "Expense categories")}>
              {list.map((category) => (
                <option key={category.id} value={category.name}>
                  {withCount(categoryLabel(category.name, t), countOf(side, category.name))}
                </option>
              ))}
            </optgroup>
          )
        );
      })}
      {(noCategory > 0 || filters.uncategorised) && <option value={NO_CATEGORY}>{withCount(t("Uncategorised"), noCategory)}</option>}
    </NativeSelect>
  );

  const picker = <PeriodPicker period={period} today={today} activeMonths={activeMonths} allowAll defaultPeriod={thisMonth} onPick={pickPeriod} align="end" />;

  const printButton = onPrint && (
    <button
      type="button"
      onClick={onPrint}
      disabled={printing}
      aria-label={t("Print")}
      title={t("Print")}
      className="flex size-11 shrink-0 items-center justify-center rounded-field border border-input bg-surface text-ink-2 transition-colors hover:border-emerald-line hover:bg-emerald-soft hover:text-emerald disabled:opacity-60"
    >
      <Printer className="size-4.25" aria-hidden="true" />
    </button>
  );

  const searchForm = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        sendSearch(search, "push");
      }}
      // The board's search takes the room the other filters leave.
      className="min-w-0 flex-1 md:min-w-44"
    >
      <Input
        type="search"
        size="md"
        value={search}
        onChange={(event) => typeSearch(event.target.value)}
        leading={<Search />}
        placeholder={t("Search description, category, account or amount…")}
        aria-label={t("Search transactions")}
        frameClassName="h-12 md:h-11"
      />
    </form>
  );

  // What is on, as chips that take their own filter off; what isn't, as
  // plain words, so the row always says the whole state.
  const chip = (label: string, remove: () => void) => (
    <button
      type="button"
      onClick={remove}
      aria-label={t("Remove {filter}", { filter: label })}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-mint-50 px-3 text-caption font-semibold whitespace-nowrap text-brand-ink pointer-coarse:h-10"
    >
      {label}
      <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
  const quiet = (label: string) => (
    <Chip tone="neutral" className="h-8 bg-surface font-semibold text-ink-2 pointer-coarse:h-10">
      {label}
    </Chip>
  );

  return (
    <>
      {/* Desktop: one bar. */}
      <div className="hidden flex-wrap items-center gap-2.5 rounded-card border border-line-card bg-surface p-3 shadow-card md:flex">
        {searchForm}
        <SegmentedControl options={typeOptions} value={type} onChange={pickType} label={t("Type")} variant="pill" className={BAR_SEGMENTS} />
        <FilterMenu label={t("Categories")} buttonLabel={categoryButton} buttonDot={categoryDot} active={categoryValue !== ""} entries={categoryEntries} onPick={pickCategory} />
        {picker}
        {printButton}
      </div>

      {/* Phone: search beside a filter button that opens the sheet; chips say what is on. */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex gap-2">
          {searchForm}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={activeCount ? t("Filters, {count} on", { count: formatCount(activeCount, fmt) }) : t("Filters")}
                className="relative flex size-12 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-ink"
              >
                <Filter className="size-4.75" aria-hidden="true" />
                {activeCount > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-emerald text-caption font-bold text-white">
                    {formatCount(activeCount, fmt)}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" showCloseButton={false} className="gap-4 rounded-t-card border-0 bg-surface p-5 pb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-h3 text-ink">{t("Filters")}</SheetTitle>
              </SheetHeader>
              <SegmentedControl options={typeOptions} value={type} onChange={pickType} label={t("Type")} stretch />
              <div className="grid gap-3">{selects}</div>
              <div className="flex">{picker}</div>
              <div className="flex gap-3">
                {activeCount > 0 && (
                  <Button variant="secondary" size="lg" onClick={clearAll} className="flex-1">
                    {t("Clear filters")}
                  </Button>
                )}
                <Button size="lg" onClick={() => setSheetOpen(false)} className="flex-1">
                  {t("Done@@sheet")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {otherPeriod ? chip(periodLabel(period, t, fmt), () => pickPeriod(thisMonth)) : quiet(periodLabel(period, t, fmt))}
          {type ? chip(t(type === "INCOME" ? "Income" : "Expense"), () => update({ type: undefined })) : quiet(t("All types"))}
          {filters.categoryId && chip(categoryLabel(filters.categoryId, t), () => update({ categoryId: undefined }))}
          {filters.uncategorised && chip(t("Uncategorised"), () => update({ uncategorised: undefined }))}
        </div>
      </div>
    </>
  );
}
