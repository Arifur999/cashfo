"use client";

import { CalendarDays, Filter, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Account, TransactionType } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { resolveDateRange, type DateRangePreset } from "@/lib/customer/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type TypeFilter = "" | TransactionType;

interface TransactionFiltersProps {
  accounts: Account[];
  categories: { id: string; name: string }[];
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "all", label: "All time" },
];

// "27 Sep – 2 Oct 2026" for a from/to pair; one side alone reads "From …" / "Until …".
export function dateRangeLabel(from: string | undefined, to: string | undefined, t: (key: string) => string): string | null {
  if (from && to) {
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${formatDate(`${from}T00:00:00.000Z`, sameYear ? "d MMM" : "d MMM yyyy")} – ${formatDate(`${to}T00:00:00.000Z`, "d MMM yyyy")}`;
  }
  if (from) return `${t("From")} ${formatDate(`${from}T00:00:00.000Z`, "d MMM yyyy")}`;
  if (to) return `${t("Until")} ${formatDate(`${to}T00:00:00.000Z`, "d MMM yyyy")}`;
  return null;
}

// The filters on Transactions: search, type, category, account and the
// date range, all kept in the URL so a filtered list can be shared and
// comes back on refresh. On phones the search stays and the rest opens in
// a sheet; chips show what is on.
export function TransactionFilters({ accounts, categories }: TransactionFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);

  const type = (searchParams.get("type") ?? "") as TypeFilter;
  const categoryId = searchParams.get("categoryId") ?? "";
  const accountId = searchParams.get("accountId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const rangeLabel = dateRangeLabel(dateFrom, dateTo, t);
  const activeCount = [type, categoryId, accountId, rangeLabel].filter(Boolean).length;

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.push(`/transactions?${next.toString()}`);
  }

  function pickPreset(preset: DateRangePreset) {
    const range = resolveDateRange(preset);
    update({ dateFrom: range.dateFrom, dateTo: range.dateTo });
  }

  const typeOptions = [
    { value: "" as TypeFilter, label: t("All") },
    { value: "INCOME" as TypeFilter, label: t("Income"), dot: "var(--income)" },
    { value: "EXPENSE" as TypeFilter, label: t("Expense"), dot: "var(--expense-fill)" },
  ];

  const selects = (
    <>
      <NativeSelect size="sm" value={categoryId} onChange={(event) => update({ categoryId: event.target.value })} aria-label={t("Category")} className="font-medium">
        <option value="">{t("All categories")}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect size="sm" value={accountId} onChange={(event) => update({ accountId: event.target.value })} aria-label={t("Wallet")} className="font-medium">
        <option value="">{t("All wallets")}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </NativeSelect>
    </>
  );

  const dateRange = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9.5 items-center gap-2 rounded-md border px-3 text-small whitespace-nowrap transition-colors",
            rangeLabel ? "border-emerald bg-mint-50 font-semibold text-emerald" : "border-line-strong bg-surface font-medium text-ink hover:bg-surface-sunken",
          )}
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {rangeLabel ?? t("Any date")}
          {rangeLabel && (
            <span
              role="button"
              tabIndex={0}
              aria-label={t("Remove date filter")}
              onClick={(event) => {
                event.stopPropagation();
                update({ dateFrom: undefined, dateTo: undefined });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  update({ dateFrom: undefined, dateTo: undefined });
                }
              }}
              className="flex"
            >
              <X className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 rounded-lg border border-line bg-surface p-3 shadow-overlay ring-0">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <Button key={preset.value} variant="outline" size="sm" onClick={() => pickPreset(preset.value)}>
              {t(preset.label)}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field htmlFor="filter-from" label={t("From")}>
            <Input id="filter-from" type="date" size="sm" value={dateFrom ?? ""} onChange={(event) => update({ dateFrom: event.target.value || undefined })} />
          </Field>
          <Field htmlFor="filter-to" label={t("To")}>
            <Input id="filter-to" type="date" size="sm" value={dateTo ?? ""} onChange={(event) => update({ dateTo: event.target.value || undefined })} />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  );

  const clear = activeCount > 0 && (
    <Button variant="ghost" size="sm" onClick={() => update({ type: undefined, categoryId: undefined, accountId: undefined, dateFrom: undefined, dateTo: undefined, search: undefined })} className="ml-auto h-9.5 px-3 text-small font-semibold">
      {t("Clear filters")}
    </Button>
  );

  const searchForm = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        update({ search: search.trim() || undefined });
      }}
      className="min-w-0 flex-1 md:flex-none"
    >
      <Input
        type="search"
        size="sm"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leading={<Search />}
        placeholder={t("Search notes…")}
        aria-label={t("Search transactions")}
        frameClassName="h-12 md:h-9.5 md:w-65"
      />
    </form>
  );

  return (
    <>
      {/* Desktop: one bar. */}
      <div className="hidden flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-card md:flex">
        {searchForm}
        <SegmentedControl options={typeOptions} value={type} onChange={(value) => update({ type: value })} label={t("Type")} />
        {selects}
        {dateRange}
        {clear}
      </div>

      {/* Phone: search beside a filter button that opens the sheet; chips say what is on. */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex gap-2">
          {searchForm}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button type="button" aria-label={`${t("Filters")}${activeCount ? `, ${activeCount} ${t("on")}` : ""}`} className="relative flex size-12 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-ink">
                <Filter className="size-[19px]" aria-hidden="true" />
                {activeCount > 0 && <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-emerald text-caption font-bold text-white">{activeCount}</span>}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" showCloseButton={false} className="gap-4 rounded-t-[18px] border-0 bg-surface p-5 pb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-h3 text-ink">{t("Filters")}</SheetTitle>
              </SheetHeader>
              <SegmentedControl options={typeOptions} value={type} onChange={(value) => update({ type: value })} label={t("Type")} stretch />
              <div className="grid gap-3">{selects}</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button key={preset.value} variant="outline" size="sm" onClick={() => pickPreset(preset.value)}>
                    {t(preset.label)}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field htmlFor="sheet-from" label={t("From")}>
                  <Input id="sheet-from" type="date" size="md" value={dateFrom ?? ""} onChange={(event) => update({ dateFrom: event.target.value || undefined })} />
                </Field>
                <Field htmlFor="sheet-to" label={t("To")}>
                  <Input id="sheet-to" type="date" size="md" value={dateTo ?? ""} onChange={(event) => update({ dateTo: event.target.value || undefined })} />
                </Field>
              </div>
              <Button size="lg" onClick={() => setSheetOpen(false)}>
                {t("Done")}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <Chip tone={rangeLabel ? "mint" : "neutral"} className={cn("font-semibold", !rangeLabel && "bg-surface text-ink-2")}>
            {rangeLabel ?? t("Any date")}
          </Chip>
          <Chip tone={type ? "mint" : "neutral"} className={cn("font-semibold", !type && "bg-surface text-ink-2")}>
            {type ? t(type === "INCOME" ? "Income" : "Expense") : t("All types")}
          </Chip>
          <Chip tone={accountId ? "mint" : "neutral"} className={cn("font-semibold", !accountId && "bg-surface text-ink-2")}>
            {accounts.find((a) => a.id === accountId)?.name ?? t("All wallets")}
          </Chip>
          {categoryId && (
            <Chip tone="mint" className="font-semibold">
              {categoryId}
            </Chip>
          )}
        </div>
      </div>
    </>
  );
}
