"use client";

import { Filter, Printer, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { listPeriodHref } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { PeriodPicker, periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, ActiveMonth } from "@/lib/customer/api";
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
}

interface TransactionFiltersProps {
  accounts: Account[];
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

// The board's filter bar: 38px dropdowns sized to the choice on show, and
// the type pill's 32px segments.
const BAR_SELECT = "pr-8.5 field-sizing-content text-small";
const BAR_SEGMENTS = "[&>button]:h-8";
// The category select's value for the money with no category.
// (a leading space: no category name can start with one, they are trimmed).
const NO_CATEGORY = " none";

// The filters on Transactions (the board's bar): a search over the
// description, category, account and amount; the type; the category, with
// how many each has in the period; the wallet; the period; and Print. All
// kept in the URL, so a filtered list can be shared and comes back on
// refresh. On phones the search stays and the rest opens in a sheet; chips
// show what is on, and each one takes its filter off.
export function TransactionFilters({ accounts, categories, counts, period, current, today, activeMonths, navigate, baseQuery, onPrint, printing = false }: TransactionFiltersProps) {
  const { t, locale, fmt } = useLocale();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const filters = readTransactionFilters((key) => searchParams.get(key));
  const type: TypeFilter = filters.type ?? "";
  const categoryValue = filters.uncategorised ? NO_CATEGORY : (filters.categoryId ?? "");
  const accountId = filters.accountId ?? "";
  const thisMonth: PickedPeriod = { kind: "month", ...current };
  const otherPeriod = !samePeriod(period, thisMonth);
  const activeCount = activeFilterCount({ ...filters, dateFrom: undefined, dateTo: undefined }) + (otherPeriod ? 1 : 0);
  const lang = displayLanguage(locale);
  const walletName = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    return account ? accountDisplayName(account, lang) : null;
  };

  // The search box follows the URL (Clear filters, Back), and keeps what is
  // being typed until it is sent.
  const urlSearch = filters.search ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [shownSearch, setShownSearch] = useState(urlSearch);
  if (urlSearch !== shownSearch) {
    setShownSearch(urlSearch);
    setSearch(urlSearch);
  }

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
    setSearch("");
    const next = baseQuery();
    const limit = next.get("limit");
    navigate(limit ? `/transactions?${new URLSearchParams({ limit }).toString()}` : "/transactions");
  }

  const typeOptions = [
    { value: "" as TypeFilter, label: t("All") },
    { value: "INCOME" as TypeFilter, label: t("Income"), dot: "var(--income)" },
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

  // On the bar each select is as wide as the choice on show, as the board's
  // dropdown buttons are; in the phone sheet they fill the row.
  const selects = (inBar: boolean) => (
    <>
      <NativeSelect size="sm" value={categoryValue} onChange={(event) => pickCategory(event.target.value)} aria-label={t("Category")} className={cn("font-medium", inBar && BAR_SELECT)}>
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
      <NativeSelect size="sm" value={accountId} onChange={(event) => update({ accountId: event.target.value })} aria-label={t("Account@@wallet")} className={cn("font-medium", inBar && BAR_SELECT)}>
        <option value="">{t("All accounts@@wallet")}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {accountDisplayName(account, lang)}
          </option>
        ))}
      </NativeSelect>
    </>
  );

  const picker = <PeriodPicker period={period} today={today} activeMonths={activeMonths} allowAll defaultPeriod={thisMonth} onPick={pickPeriod} align="end" />;

  const printButton = onPrint && (
    <button
      type="button"
      onClick={onPrint}
      disabled={printing}
      aria-label={t("Print")}
      title={t("Print")}
      className="flex size-9.5 shrink-0 items-center justify-center rounded-sm border border-input bg-surface text-ink-2 hover:bg-surface-sunken disabled:opacity-60 pointer-coarse:size-11"
    >
      <Printer className="size-4.25" aria-hidden="true" />
    </button>
  );

  const clear = activeCount > 0 && (
    <Button variant="ghost" size="sm" onClick={clearAll} className="h-9.5 px-2.5 text-small font-semibold text-ink-soft">
      {t("Clear filters")}
    </Button>
  );

  const searchForm = (placeholder: string) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        update({ search: search.trim() || undefined });
      }}
      // The board's search takes the room the other filters leave.
      className="min-w-0 flex-1 md:min-w-60"
    >
      <Input
        type="search"
        size="sm"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leading={<Search />}
        placeholder={placeholder}
        aria-label={t("Search transactions")}
        frameClassName="h-12 md:h-9.5"
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
        {searchForm(t("Search description, category, account or amount…"))}
        <SegmentedControl options={typeOptions} value={type} onChange={pickType} label={t("Type")} variant="pill" className={BAR_SEGMENTS} />
        {selects(true)}
        {picker}
        {clear}
        {printButton}
      </div>

      {/* Phone: search beside a filter button that opens the sheet; chips say what is on. */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex gap-2">
          {searchForm(t("Search description, category, account or amount…"))}
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
              <div className="grid gap-3">{selects(false)}</div>
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
          {accountId ? chip(walletName(accountId) ?? t("Wallet"), () => update({ accountId: undefined })) : quiet(t("All accounts@@wallet"))}
          {filters.categoryId && chip(categoryLabel(filters.categoryId, t), () => update({ categoryId: undefined }))}
          {filters.uncategorised && chip(t("Uncategorised"), () => update({ uncategorised: undefined }))}
        </div>
      </div>
    </>
  );
}
