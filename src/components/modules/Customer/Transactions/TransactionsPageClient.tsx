"use client";

import { ArrowUpRight, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PrintPreview } from "@/components/modules/Customer/Balance/PrintPreview";
import { listPeriodHref } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { type SavedEntry, TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import { periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { LIST_ROW_ACTION, LIST_ROW_DELETE, ListCard, ListCell, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, ActiveMonth, Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, ieCategoryInk, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { type PickedPeriod, periodRange, type YearMonth } from "@/lib/customer/period";
import { listIncomeExpenseForPrintAction } from "@/lib/customer/transferActions";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { type CategoryCounts, categoryIndex, categoryLabel, dayHeading, describeTransaction, type EditableEntry, editableEntry, groupByDay, owningFeature, readTransactionFilters, rowTitle, type TransactionRow } from "@/lib/customer/transactionRows";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { type FilterCategory, TransactionFilters } from "./TransactionFilters";
import { IEStatement, type StatementLine } from "./IEStatement";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";

export interface TransactionTotals {
  income: number;
  expense: number;
  // "all": every matching transaction (the summary, or the category
  // breakdown on an older backend); "page": only the rows on this page,
  // when an older backend can't total a search or category filter.
  scope: "all" | "page";
}

interface TransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: (FilterCategory & { icon: string | null; color: string })[];
  // How many transactions each category has in the period (the dropdown's counts).
  categoryCounts: CategoryCounts;
  period: PickedPeriod;
  current: YearMonth;
  // The months with any income or expense; null when that can't be read.
  activeMonths: ActiveMonth[] | null;
  meta: { page: number; limit: number; total: number; totalPages: number };
  pageSize: number;
  currency: string;
  today: string;
  totals: TransactionTotals;
  // The real net of a day that goes on past this page, by day.
  dayTotals: Record<string, number>;
  // The days this page shares with the pages around it.
  splitDays: { before: string | null; after: string | null };
  canManage: boolean;
  // ?new=1: the New transaction popup opens with the page.
  openNew: boolean;
}

// The board's table: #, Date, Type, Category, Description (its account
// under it), Amount, Actions. Below xl the type and the category go under
// the description, so it never drops under 12rem beside the sidebar (iPads,
// small laptops).
const COLUMNS = "md:grid-cols-[32px_100px_minmax(12rem,1fr)_128px_96px] xl:grid-cols-[32px_104px_92px_minmax(130px,0.75fr)_minmax(0,1.25fr)_128px_96px]";
const LIST_ID = "transactions-list";
const PHONE_LIST_ID = "transactions-list-phone";
// The Income & Expense popup offers the two kinds (a transfer is Balance's).
const IE_KINDS = ["INCOME", "EXPENSE"] as const;
// How long a saved row stays lit.
const HIGHLIGHT_MS = 3500;
// Settings › App preferences › Compact tables (data-compact on the page's
// main): the rows close up, as a table's cells do.
const COMPACT_ROW = "in-data-[compact=true]:min-h-12 in-data-[compact=true]:py-1";

// Income & Expense > Transactions (the Transactions board): the totals
// strip, the filters with the period and Print, and the list, newest first.
// A category opens its own; a feature's own posting (zakat, a charge, an
// asset, a savings move, a referral payout) is changed on its own page.
export function TransactionsPageClient({ businessId, transactions, accounts, categories, categoryCounts, period, current, activeMonths, meta, pageSize, currency, today, totals, dayTotals, splitDays, canManage, openNew }: TransactionsPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(openNew && canManage);
  const [voiding, setVoiding] = useState<TransactionRow | null>(null);
  // A row's Edit: the transaction popup filled in with it.
  const [editing, setEditing] = useState<EditableEntry | null>(null);
  // Print: the statement of every matching transaction, once loaded.
  const [printing, setPrinting] = useState<{ transactions: Transaction[]; complete: boolean } | null>(null);
  const [loadingPrint, startPrint] = useTransition();
  // The row just saved, lit for a moment (the board's highlight).
  const [highlight, setHighlight] = useState<string | null>(null);

  const lang = displayLanguage(locale);
  const accountNames = Object.fromEntries(accounts.map((account) => [account.id, accountDisplayName(account, lang)]));
  const categoriesById = categoryIndex(categories);
  const groups = groupByDay(transactions.map((transaction) => describeTransaction(transaction, categoriesById, accountNames, locale)));
  const filters = readTransactionFilters((key) => searchParams.get(key));
  const filtered = !!(filters.type || filters.categoryId || filters.uncategorised || filters.search);

  // A new account (no income or expense in any month): nothing to find yet.
  const blank = activeMonths !== null && activeMonths.length === 0 && meta.total === 0 && !filtered;

  // ?new=1 has opened the popup; the address forgets it, so a refresh or
  // Back doesn't open it again (no new request: the history entry only).
  useEffect(() => {
    if (!openNew) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [openNew]);

  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

  // The address last asked for, until it lands. useSearchParams keeps the
  // old URL while a navigation loads, so a second change made by then (From,
  // then To) builds on this one, or it would drop the first.
  const requested = useRef<string | null>(null);
  const shownQuery = searchParams.toString();
  useEffect(() => {
    if (!isPending) requested.current = null;
  }, [isPending, shownQuery]);
  const baseQuery = () => new URLSearchParams(requested.current ? new URL(requested.current, window.location.origin).search : shownQuery);

  // Filter changes run in a transition, so the list can dim
  // while the next one loads (the API may take its time).
  const navigate = (href: string, mode: "push" | "replace" = "push") => {
    requested.current = href;
    startTransition(() => {
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  const hrefFor = (page: number) => pageHref("/transactions", searchParams, page);

  // A row's category opens just that category, the rest kept.
  const showOnly = (row: TransactionRow) => {
    const next = Object.fromEntries(baseQuery());
    delete next.page;
    if (row.uncategorised) {
      delete next.categoryId;
      next.uncategorised = "1";
    } else if (row.entryCategory) {
      delete next.uncategorised;
      next.categoryId = row.entryCategory;
    }
    navigate(listPeriodHref("/transactions", next, period, current));
  };

  // A saved entry is lit in the list. A filter that would hide it is let go
  // (the board widens them): its month for the period, then the type, the
  // category and a search it doesn't match; the first page,
  // where the newest are.
  function showSaved(saved: SavedEntry) {
    setHighlight(saved.id);
    const { dateFrom, dateTo } = periodRange(period);
    const inPeriod = (!dateFrom || saved.day >= dateFrom) && (!dateTo || saved.day <= dateTo);
    const next = Object.fromEntries(baseQuery());
    let moved = false;
    const drop = (key: string) => {
      if (next[key] === undefined) return;
      delete next[key];
      moved = true;
    };
    if (filters.type && filters.type !== saved.kind) drop("type");
    if (filters.uncategorised ? saved.category !== "" : filters.categoryId && filters.categoryId !== saved.category) {
      drop("categoryId");
      drop("uncategorised");
    }
    const words = filters.search?.toLowerCase();
    if (words && ![saved.note, saved.category].some((text) => text.toLowerCase().includes(words))) drop("search");
    if (!inPeriod) {
      const [year, month] = saved.day.split("-").map(Number);
      delete next.page;
      navigate(listPeriodHref("/transactions", next, { kind: "month", year, month }, current));
      return;
    }
    if (moved || (next.page && next.page !== "1")) {
      delete next.page;
      const query = new URLSearchParams(next).toString();
      navigate(query ? `/transactions?${query}` : "/transactions");
    }
  }

  // Print loads every transaction the filters match, not just this page.
  function print() {
    const { dateFrom, dateTo } = periodRange(period);
    startPrint(async () => {
      const result = await listIncomeExpenseForPrintAction(businessId, { dateFrom, dateTo, type: filters.type, categoryId: filters.categoryId, uncategorised: filters.uncategorised, search: filters.search });
      if (result.success && result.data) setPrinting(result.data);
      else toast.error(t("Couldn't load the transactions to print. Try again."));
    });
  }
  const { dateFrom: rangeFrom, dateTo: rangeTo } = periodRange(period);
  const statementLines: StatementLine[] = (printing?.transactions ?? [])
    .filter((transaction) => transaction.transactionType === "INCOME" || transaction.transactionType === "EXPENSE")
    .map((transaction) => {
      const row = describeTransaction(transaction, categoriesById, accountNames, locale);
      return {
        id: transaction.id,
        date: transaction.transactionDate,
        kind: transaction.transactionType as "INCOME" | "EXPENSE",
        category: row.uncategorised ? t("Uncategorised") : row.category ? categoryLabel(row.category.name, t) : "—",
        description: rowTitle(row, t),
        account: row.wallet ?? "",
        amount: Math.abs(row.signedAmount),
      };
    });

  // A band's net is the day's own: the rows here, or for a day that goes
  // on past this page, the day's total. Without one it says it goes on.
  const dayBand = (day: string, net: number) => {
    const real = dayTotals[day];
    if (real !== undefined) return { net: real, note: null };
    const before = splitDays.before === day;
    const after = splitDays.after === day;
    if (before || after) return { net: null, note: t(before && after ? "Continues on other pages" : after ? "Continues on the next page" : "Continued from the previous page") };
    return { net, note: null };
  };

  const netText = (net: number) => <span className={cn("tabular-nums", net > 0 ? "text-income" : net < 0 ? "text-expense" : "text-ink-muted")}>{formatSignedCurrency(net, currency, fmt)}</span>;

  // "Showing 1–10 of 29".
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);
  const showing = (
    <span>
      {meta.total > 0 ? t("Showing {range} of {total}", { range: toLocaleDigits(`${first}–${last}`, fmt), total: formatCount(meta.total, fmt) }) : t("No transactions")}
      {totals.scope === "page" && ` · ${t("Totals: this page")}`}
    </span>
  );

  const pager = (focusTargetId: string) => (
    <Pagination
      page={meta.page}
      totalPages={meta.totalPages}
      total={meta.total}
      pageSize={pageSize}
      hrefFor={hrefFor}
      focusTargetId={focusTargetId}
      summary={showing}
      size="lg"
    />
  );

  const addButton = canManage && (
    <Button size="lg" onClick={() => setAddOpen(true)} className="gap-1.5 px-4.5">
      <Plus strokeWidth={2.5} className="size-4" />
      {t("Transaction")}
    </Button>
  );

  // Nothing to show: the board's empty block inside the list.
  const empty = transactions.length === 0 && (
    <div role="row">
      <div role="cell" className="flex flex-col items-center justify-center gap-2.5 px-6 py-16 text-center">
        <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
          <Search className="size-6" />
        </span>
        <h2 className="text-title font-semibold text-ink">{blank ? t("No transactions yet") : t("No transactions found")}</h2>
        <p className="max-w-105 text-body text-ink-muted">
          {!blank ? t("Try another month, type or category, or clear the search.") : canManage ? t("Add your first income or expense to see it here.") : t("Only an owner or accountant can add transactions")}
        </p>
        {!blank ? (
          <Button variant="secondary" asChild className="mt-1">
            <Link href="/transactions">{t("Clear filters")}</Link>
          </Button>
        ) : (
          canManage && (
            <Button variant="secondary" onClick={() => setAddOpen(true)} className="mt-1">
              {t("New transaction")}
            </Button>
          )
        )}
      </div>
    </div>
  );

  return (
    // Desktop: the frame is the window's height and the list card takes the
    // rest, its rows scrolling inside it with the pager pinned (the board).
    <PageFrame className="leading-[normal] md:h-full md:pb-8">
      {/* On a phone the floating + adds, and the title stands alone. */}
      <PageHeader title={t("Every income and expense transaction.")} actions={addButton} hideActionsOnPhone className="md:items-center" />

      {/* Two small cards on a phone; the board's strip of three (Income,
          Expense, Net) on wider screens. A type filter dims the kind it
          leaves out, as the board does. */}
      <Card padding="none" aria-busy={isPending || undefined} className={cn("grid grid-cols-2 transition-opacity max-md:gap-2 max-md:border-0 max-md:bg-transparent max-md:shadow-none md:grid-cols-3", isPending && "opacity-60")}>
        <TotalCell label={t("Income")} phoneLabel={t("Money in")} dim={filters.type === "EXPENSE"} className="max-md:rounded-lg max-md:border max-md:border-line max-md:bg-surface">
          <AmountText value={totals.income} currency={currency} tone="inherit" signed className={cn(FIGURE, "text-success")} />
        </TotalCell>
        <TotalCell label={t("Expense")} phoneLabel={t("Money out")} dim={filters.type === "INCOME"} divided className="max-md:rounded-lg max-md:border max-md:border-line max-md:bg-surface">
          <AmountText value={-totals.expense} currency={currency} tone="inherit" signed className={cn(FIGURE, "text-expense-fill")} />
        </TotalCell>
        <TotalCell label={t("Net")} dim={!!filters.type} divided className="max-md:hidden">
          <AmountText value={totals.income - totals.expense} currency={currency} signed tone="inherit" className={cn(FIGURE, totals.income - totals.expense < 0 ? "text-expense" : "text-ink")} />
        </TotalCell>
      </Card>

      <TransactionFilters
        categories={categories}
        counts={categoryCounts}
        period={period}
        current={current}
        today={today}
        activeMonths={activeMonths}
        navigate={navigate}
        baseQuery={baseQuery}
        onPrint={print}
        printing={loadingPrint}
      />

      {/* Desktop: one list with the column heads (on a phone only while it
          is empty: then it holds the empty block). */}
      <ListCard
        id={LIST_ID}
        label={t("Transactions list")}
        busy={isPending}
        className={cn("transition-opacity md:flex md:min-h-80 md:flex-1 md:flex-col", transactions.length > 0 && "max-md:hidden", isPending && "opacity-60")}
        tableClassName="md:min-h-0 md:flex-1 md:overflow-y-auto"
        footer={<ListFooter>{meta.total > 0 ? pager(LIST_ID) : showing}</ListFooter>}
      >
        {/* Above the rows' buttons (z-10) as they scroll under it. */}
        <ListHead columns={COLUMNS} sticky className="h-auto gap-x-3.5 py-3 font-semibold">
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Type")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Category")}</ListHeadCell>
          <ListHeadCell>{t("Description")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {groups
          .flatMap((group) => group.rows)
          .map((row, index) => (
            <DesktopRow
              key={row.transaction.id}
              // Counted across pages: page 2 of 20 starts at 21.
              number={(meta.page - 1) * meta.limit + index + 1}
              row={row}
              currency={currency}
              canManage={canManage}
              lit={row.transaction.id === highlight}
              onVoid={() => setVoiding(row)}
              onEdit={() => setEditing(editableEntry(row.transaction, rowTitle(row, t), row.entryCategory))}
              onShowOnly={() => showOnly(row)}
            />
          ))}
        {empty}
      </ListCard>

      {/* Phone: a day heading, then a card of rows, per day. Named, as
          the pager focuses it after a page change. */}
      {transactions.length > 0 && (
        <div id={PHONE_LIST_ID} role="region" aria-label={t("Transactions")} aria-busy={isPending || undefined} className={cn("flex scroll-mt-4 flex-col transition-opacity md:hidden", isPending && "opacity-60")}>
          {groups.map((group) => {
            const band = dayBand(group.day, group.net);
            return (
              <div key={group.day}>
                <div className="flex justify-between gap-3 px-1 pt-4 pb-2 text-small font-semibold text-ink-2">
                  <span>{dayHeading(group.day, today, t, fmt)}</span>
                  {band.note ? <span className="font-medium text-ink-muted">{band.note}</span> : netText(band.net ?? 0)}
                </div>
                <Card padding="none" elevated={false} className="overflow-hidden">
                  {group.rows.map((row, index) => (
                    <PhoneRow key={row.transaction.id} row={row} currency={currency} divided={index > 0} lit={row.transaction.id === highlight} />
                  ))}
                </Card>
              </div>
            );
          })}
          <div className="px-1 pt-3">{pager(PHONE_LIST_ID)}</div>
        </div>
      )}

      {canManage && <TransactionDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} currency={currency} initialKind={null} kinds={[...IE_KINDS]} onSaved={showSaved} />}
      {canManage && editing && <TransactionDrawer open onClose={() => setEditing(null)} businessId={businessId} currency={currency} editing={editing} stayOnEdit onSaved={(saved) => setHighlight(saved.id)} />}
      {printing && (
        <PrintPreview subtitle={["A4", plural(t, statementLines.length, "{count} transaction", "{count} transactions", undefined, fmt), periodLabel(period, t, fmt)].join(" · ")} onClose={() => setPrinting(null)}>
          <IEStatement
            lines={statementLines}
            periodLabel={periodLabel(period, t, fmt)}
            range={rangeFrom && rangeTo ? `${formatDate(rangeFrom, undefined, fmt)} – ${formatDate(rangeTo, undefined, fmt)}` : null}
            type={filters.type ?? null}
            category={filters.uncategorised ? t("Uncategorised") : filters.categoryId ? categoryLabel(filters.categoryId, t) : null}
            search={filters.search ?? null}
            capped={!printing.complete}
            today={today}
            currency={currency}
          />
        </PrintPreview>
      )}
      {voiding && <DeleteTransactionDialog row={voiding} businessId={businessId} currency={currency} onClose={() => setVoiding(null)} />}
    </PageFrame>
  );
}

// The strip's figures: 18px bold on phones, the board's 22px from md up.
const FIGURE = "text-h3 font-bold max-md:leading-[1.2] md:text-[22px]";

// The desktop board says Income and Expense; the phone board, Money in and
// Money out (phoneLabel). A kind the type filter leaves out fades.
function TotalCell({ label, phoneLabel = label, dim = false, children, divided = false, className }: { label: string; phoneLabel?: string; dim?: boolean; children: React.ReactNode; divided?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 transition-opacity md:px-6 md:py-4", divided && "md:border-l md:border-line", dim && "opacity-45", className)}>
      <span className="text-small text-ink-muted md:hidden">{phoneLabel}</span>
      <span className="text-small text-ink-muted max-md:hidden">{label}</span>
      {children}
    </div>
  );
}

function CategoryTile({ row, size = 36 }: { row: TransactionRow; size?: 36 | 40 }) {
  const tone = row.transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  const icon = row.category ? categoryIconFor(row.category) : Receipt;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", size === 40 ? "size-10 rounded-md [&_svg]:size-4.5" : "size-9 rounded-[10px] [&_svg]:size-4.25", tone.bg, tone.fg)}>
      {createElement(icon, { "aria-hidden": true })}
    </span>
  );
}

// The type as the board's pill: Income green, Expense red, anything else
// (a transfer, a loan or asset posting) plain.
const TYPE_BADGE: Record<string, string> = { INCOME: "bg-success-soft text-tint-green-ink", EXPENSE: "bg-expense-soft text-expense" };
// The amount in the board's green or red.
const AMOUNT_TONE: Record<string, string> = { INCOME: "text-tint-green-ink", EXPENSE: "text-expense-fill" };

// Where a feature's own posting is changed: the page that keeps it, as a
// pill in its colours (Zakat's green, the rest grey).
function sourceOf(row: TransactionRow): { href: string; label: string; tip: string; tone: string } | null {
  const transaction = row.transaction;
  const grey = "bg-surface-sunken text-ink-2";
  if (transaction.transactionType === "EXPENSE" && row.entryCategory === "Zakat") return { href: "/zakat", label: "Zakat", tip: "Recorded on the Zakat page. Change it there.", tone: "bg-note-green text-tint-green-ink" };
  if (transaction.chargeForId) return { href: `/transactions/${transaction.chargeForId}`, label: "Its transfer", tip: "A charge on a transfer or a loan entry. Change it there.", tone: grey };
  const feature = owningFeature(transaction);
  if (feature === "asset") return { href: "/assets-management/purchase-sell", label: "Assets", tip: "Recorded on the Assets page. Change it there.", tone: grey };
  if (feature === "savings") return { href: "/savings-goals/dashboard", label: "Savings", tip: "Recorded on the Savings goals page. Change it there.", tone: grey };
  if (feature === "referral") return { href: "/referrals", label: "Referrals", tip: "Recorded by the referral program.", tone: grey };
  if (feature === "investment") return { href: "/investments/transactions", label: "Invest@@pill", tip: "Recorded on the Investments page. Change it there.", tone: grey };
  return null;
}

function DesktopRow({ number, row, currency, canManage, lit, onVoid, onEdit, onShowOnly }: { number: number; row: TransactionRow; currency: string; canManage: boolean; lit: boolean; onVoid: () => void; onEdit: () => void; onShowOnly: () => void }) {
  const { t, fmt } = useLocale();
  const href = `/transactions/${row.transaction.id}`;
  const kind = row.transaction.transactionType;
  const dot = ieCategoryInk(row.uncategorised ? null : row.category?.color);
  const title = rowTitle(row, t);
  const category = row.uncategorised && !owningFeature(row.transaction) ? t("Uncategorised") : row.category && categoryLabel(row.category.name, t);
  const filterable = row.uncategorised || !!row.entryCategory;
  const typeLabel = t(TRANSACTION_TYPE_LABELS[kind]);
  const editable = canManage && !row.cancelled && editableEntry(row.transaction, title, row.entryCategory) !== null;
  const source = !row.cancelled ? sourceOf(row) : null;
  return (
    // The board's 64px row over its own line. A voided row fades to 60% as
    // the board sets it back; its buttons stay solid. A row just saved is
    // lit for a moment.
    <ListRow columns={COLUMNS} muted={!!row.cancelled} className={cn("min-h-[65px] gap-x-3.5 border-b transition-colors [[data-slot=list-row]+&]:border-t-0 duration-500", COMPACT_ROW, lit && "bg-emerald-soft", row.cancelled && "[&>[role=cell]:not([data-slot=list-row-actions])]:opacity-60")}>
      <ListCell className="text-small text-ink-muted tabular-nums">{formatCount(number, fmt)}</ListCell>
      <ListCell className="text-small whitespace-nowrap text-ink-soft tabular-nums">{formatDate(row.transaction.transactionDate, "d MMM yyyy", fmt)}</ListCell>
      <ListCell className="hidden xl:block">
        <span className={cn("inline-flex rounded-full px-2.5 py-0.75 text-caption font-semibold", TYPE_BADGE[kind] ?? "bg-surface-sunken text-ink-2")}>{typeLabel}</span>
      </ListCell>
      <ListCell className="hidden min-w-0 items-center gap-2 text-body text-ink-2 xl:flex">
        {category ? (
          filterable ? (
            <button type="button" onClick={onShowOnly} title={t("Show only {name}", { name: category })} className="relative z-10 flex min-w-0 items-center gap-2 rounded-sm text-left hover:underline">
              <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", dot)} />
              <span className="truncate">{category}</span>
            </button>
          ) : (
            <>
              <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", dot)} />
              <span className="truncate">{category}</span>
            </>
          )
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </ListCell>
      <ListCell className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <ListRowLink href={href} title={title} className={cn("truncate text-body font-medium text-ink", row.cancelled && "line-through")}>
            {title}
          </ListRowLink>
          {row.cancelled && (
            <Chip tone="expense" size="sm" className="h-auto py-0.5 text-[11px] font-semibold">
              {t(row.cancelled)}
            </Chip>
          )}
        </span>
        <span className="truncate text-caption text-ink-muted">
          <span className="xl:hidden">{[typeLabel, category].filter(Boolean).join(" · ")}</span>
          {row.wallet && <span className="xl:hidden"> · </span>}
          {row.wallet}
        </span>
      </ListCell>
      <ListCell align="end">
        <AmountText
          value={row.signedAmount}
          currency={currency}
          signed={kind !== "TRANSFER"}
          tone="inherit"
          size="sm"
          className={cn("text-[15px] font-semibold whitespace-nowrap", row.cancelled ? "text-ink-muted line-through" : (AMOUNT_TONE[kind] ?? "text-ink"))}
        />
      </ListCell>
      <ListRowActions className="gap-1.5">
        {source && !editable && (
          <Link href={source.href} title={t(source.tip)} className={cn("relative z-10 flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold whitespace-nowrap hover:brightness-95 pointer-coarse:h-11", source.tone)}>
            {t(source.label)}
            <ArrowUpRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
          </Link>
        )}
        {editable && (
          <button type="button" onClick={onEdit} aria-label={t("Edit {name}", { name: title })} title={t("Edit")} className={LIST_ROW_ACTION}>
            <Pencil aria-hidden="true" />
          </button>
        )}
        {canManage && row.transaction.voidable && (
          <button type="button" onClick={onVoid} aria-label={t("Delete {name}", { name: title })} title={t("Delete")} className={cn(LIST_ROW_ACTION, LIST_ROW_DELETE)}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </ListRowActions>
    </ListRow>
  );
}

function PhoneRow({ row, currency, divided, lit }: { row: TransactionRow; currency: string; divided: boolean; lit: boolean }) {
  const { t } = useLocale();
  return (
    <Link
      href={`/transactions/${row.transaction.id}`}
      className={cn("box-content grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 transition-colors duration-500", COMPACT_ROW, divided && "border-t border-divider", row.cancelled && "opacity-60", lit && "bg-emerald-soft")}
    >
      <CategoryTile row={row} size={40} />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate text-title text-ink", row.cancelled && "line-through")}>{rowTitle(row, t)}</span>
        <span className="truncate text-small text-ink-muted">{[row.cancelled && t(row.cancelled), row.category && categoryLabel(row.category.name, t), row.wallet].filter(Boolean).join(" · ")}</span>
      </span>
      <AmountText
        value={row.signedAmount}
        currency={currency}
        signed={row.transaction.transactionType !== "TRANSFER"}
        tone={row.cancelled || row.transaction.transactionType === "TRANSFER" ? "neutral" : "auto"}
        size="md"
        className={cn("font-bold whitespace-nowrap", row.cancelled && "text-ink-muted line-through")}
      />
    </Link>
  );
}
