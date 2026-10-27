"use client";

import { CircleOff, Eye, Lock, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Kbd from "@/components/smartly/Kbd";
import { ListCard, ListCell, ListFooter, ListGroupRow, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatSignedCurrency } from "@/lib/customer/currency";
import { activeFilterCount, categoryIndex, categoryLabel, dayHeading, describeTransaction, groupByDay, isReversedRange, readTransactionFilters, rowTitle, type TransactionRow } from "@/lib/customer/transactionRows";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { pageHref, readPageParam, readPageSizeParam } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { type FilterCategory, TransactionFilters } from "./TransactionFilters";
import { VoidTransactionDialog } from "./VoidTransactionDialog";

export interface TransactionTotals {
  income: number;
  expense: number;
  count: number;
  voided: number;
  // "all": every matching transaction (the summary, or the category
  // breakdown on an older backend); "page": only the rows on this page,
  // when an older backend can't total a search, wallet or category filter.
  scope: "all" | "page";
}

interface TransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: (FilterCategory & { icon: string | null; color: string })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  pageSize: number;
  pageSizes: number[];
  defaultPageSize: number;
  currency: string;
  today: string;
  totals: TransactionTotals;
  // The real net of a day that goes on past this page, by day.
  dayTotals: Record<string, number>;
  // The days this page shares with the pages around it.
  splitDays: { before: string | null; after: string | null };
  canManage: boolean;
}

// Below xl the category and the wallet go under the title, so the name
// column never drops under 12rem beside the sidebar (iPads, small laptops).
const COLUMNS = "md:grid-cols-[minmax(12rem,1fr)_140px_80px] xl:grid-cols-[minmax(12rem,1fr)_190px_160px_140px_80px]";
const LIST_ID = "transactions-list";
const PHONE_LIST_ID = "transactions-list-phone";

// The row's buttons wait for the pointer on a screen that can hover; on a
// touch screen they always show, so a tap never lands on an unseen Void.
const HOVER_ACTIONS = "transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";
// The board's 32px round buttons, ringed rather than bordered.
const ROW_ACTION = "flex size-8 items-center justify-center rounded-full bg-surface shadow-[0_0_0_1px_var(--line)] pointer-coarse:size-11";

// The board's light column heads (#F8F8F8, muted 12px words) in place of
// the shared Aurora band.
const LIGHT_HEAD = "border-line bg-table-head bg-none text-ink-muted";

// The design-v4 page title: 24px semibold on a 1.3 line.
const V4_TITLE = "[&_h1]:text-[24px] [&_h1]:leading-[1.3] [&_h1]:font-semibold [&_h1]:tracking-[-0.02em]";

// Transactions: the filters, the totals strip, and the list grouped by
// day with each day's net, newest first.
export function TransactionsPageClient({ businessId, transactions, accounts, categories, meta, pageSize, pageSizes, defaultPageSize, currency, today, totals, dayTotals, splitDays, canManage }: TransactionsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [voiding, setVoiding] = useState<TransactionRow | null>(null);

  const lang = displayLanguage(locale);
  const accountNames = Object.fromEntries(accounts.map((account) => [account.id, accountDisplayName(account, lang)]));
  const categoriesById = categoryIndex(categories);
  const groups = groupByDay(transactions.map((transaction) => describeTransaction(transaction, categoriesById, accountNames, locale)));
  const filters = readTransactionFilters((key) => searchParams.get(key));
  const filtered = activeFilterCount(filters) > 0;

  // A new account: nothing to filter or total yet, so only the empty card.
  const blank = !filtered && meta.total === 0;

  // The address last asked for, until it lands. useSearchParams keeps the
  // old URL while a navigation loads, so a second change made by then (From,
  // then To) builds on this one, or it would drop the first.
  const requested = useRef<string | null>(null);
  const shownQuery = searchParams.toString();
  useEffect(() => {
    if (!isPending) requested.current = null;
  }, [isPending, shownQuery]);
  const baseQuery = () => new URLSearchParams(requested.current ? new URL(requested.current, window.location.origin).search : shownQuery);

  // Filter and page-size changes run in a transition, so the list can dim
  // while the next one loads (the API may take its time).
  const navigate = (href: string, mode: "push" | "replace" = "push") => {
    requested.current = href;
    startTransition(() => {
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  const hrefFor = (page: number) => pageHref("/transactions", searchParams, page);

  // Clearing the filters keeps the page size the reader picked, as the
  // filter bar's Clear does.
  const limitParam = searchParams.get("limit");
  const clearHref = limitParam ? `/transactions?${new URLSearchParams({ limit: limitParam }).toString()}` : "/transactions";

  // A new page size keeps the first row of the page on show (or asked for)
  // in view.
  function changePageSize(size: number) {
    const next = baseQuery();
    const firstRow = (readPageParam(next) - 1) * readPageSizeParam(next, pageSizes, defaultPageSize);
    if (size === defaultPageSize) next.delete("limit");
    else next.set("limit", String(size));
    const page = Math.floor(firstRow / size) + 1;
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    const query = next.toString();
    navigate(query ? `/transactions?${query}` : "/transactions");
  }

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

  const netText = (net: number) => <span className={cn("tabular-nums", net > 0 ? "text-income" : net < 0 ? "text-expense" : "text-ink-muted")}>{formatSignedCurrency(net, currency, locale)}</span>;

  const pager = (focusTargetId: string) => (
    <Pagination
      page={meta.page}
      totalPages={meta.totalPages}
      total={meta.total}
      pageSize={pageSize}
      hrefFor={hrefFor}
      pageSizes={pageSizes}
      onPageSizeChange={changePageSize}
      focusTargetId={focusTargetId}
    />
  );

  // A view-only member is told why there is nothing to add with, rather
  // than finding out from a refused save.
  const addButton = canManage ? (
    <Button variant="action" onClick={() => setAddOpen(true)} className="gap-1.5 rounded-full shadow-button">
      <Plus strokeWidth={2.5} className="size-4" />
      {t("New transaction")}
    </Button>
  ) : (
    <span className="flex items-center gap-2 text-small text-ink-muted">
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
      {t("Only an owner or accountant can add transactions")}
    </span>
  );

  return (
    <PageFrame>
      {/* On a phone the floating + adds, and the title stands alone. */}
      <PageHeader
        title={t("Transactions")}
        description={t("Every income and expense you've added, newest first.")}
        hideDescriptionOnPhone
        actions={addButton}
        hideActionsOnPhone
        className={cn("md:mb-1", V4_TITLE)}
      />

      {!blank && <TransactionFilters accounts={accounts} categories={categories} navigate={navigate} baseQuery={baseQuery} />}

      {/* Two small cards on a phone; one strip of four on wider screens. */}
      {!blank && (
        <Card padding="none" aria-busy={isPending || undefined} className={cn("grid grid-cols-2 transition-opacity max-md:gap-2 max-md:border-0 max-md:bg-transparent max-md:shadow-none md:grid-cols-4", isPending && "opacity-60")}>
          <TotalCell label={t("Income")} phoneLabel={t("Money in")} className="max-md:rounded-lg max-md:border max-md:border-line max-md:bg-surface">
            <AmountText value={totals.income} currency={currency} size="h2" tone="income" signed className={PHONE_FIGURE} />
          </TotalCell>
          <TotalCell label={t("Expense")} phoneLabel={t("Money out")} divided className="max-md:rounded-lg max-md:border max-md:border-line max-md:bg-surface">
            <AmountText value={-totals.expense} currency={currency} size="h2" tone="expense" signed className={PHONE_FIGURE} />
          </TotalCell>
          <TotalCell label={t("Net")} divided className="max-md:hidden">
            <AmountText value={totals.income - totals.expense} currency={currency} size="h2" signed className="text-h3 md:text-[20px] md:font-bold" />
          </TotalCell>
          <TotalCell label={t("Transactions")} divided className="max-md:hidden">
            <span className="text-h3 text-ink tabular-nums md:text-[20px] md:font-bold">
              {formatCount(totals.count, locale)}
              {totals.voided > 0 && <span className="text-small font-medium text-ink-muted"> · {t("{count} voided", { count: formatCount(totals.voided, locale) })}</span>}
              {totals.scope === "page" && <span className="text-small font-medium text-ink-muted"> · {t("this page")}</span>}
            </span>
          </TotalCell>
        </Card>
      )}

      {transactions.length === 0 ? (
        <Card padding="none" className="flex min-h-140 flex-col items-center justify-center gap-2.5 p-10 text-center md:min-h-160.5">
          <EmptyIllustration />
          <h2 className="text-h3 text-ink">{filtered ? t("Nothing matches these filters") : t("No transactions yet")}</h2>
          <p className="max-w-105 text-body leading-[1.55] text-ink-muted">
            {filtered
              ? isReversedRange(filters)
                ? t("From is after To, so nothing can match. Swap the dates.")
                : t("Try a wider date range, or clear the filters.")
              : canManage
                ? t("Add your first income or expense. It takes a few seconds, and your dashboard, budget and reports fill in from here.")
                : t("Only an owner or accountant can add transactions")}
          </p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">
            {canManage && (
              <Button variant="action" onClick={() => setAddOpen(true)} className="gap-1.5 rounded-full">
                <Plus strokeWidth={2.5} className="size-3.75" />
                {filtered ? t("New transaction") : t("Add first transaction")}
              </Button>
            )}
            {filtered ? (
              <Button variant="secondary" asChild className="rounded-sm border-input">
                <Link href={clearHref}>{t("Clear filters")}</Link>
              </Button>
            ) : (
              <Button variant="secondary" asChild className="rounded-sm border-input">
                <Link href="/categories">{t("Set up categories first")}</Link>
              </Button>
            )}
          </div>
          {/* N opens the Add menu, whose first three picks (I, E, T) add a
              transaction; phones have no keyboard to press it on. */}
          {!filtered && canManage && (
            <p className="mt-3.5 hidden items-center gap-1.5 text-caption text-ink-muted md:flex">
              {fillNodes(t("Tip: press {key} anywhere to add a transaction"), {
                key: <Kbd className="rounded-[4px] bg-strip px-1.5 py-px font-sans text-[11px] font-semibold text-ink-soft">N</Kbd>,
              })}
            </p>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop: one list with the column heads and the day groups. */}
          <ListCard
            id={LIST_ID}
            label={t("Transactions")}
            busy={isPending}
            className={cn("hidden transition-opacity md:block", isPending && "opacity-60")}
            footer={<ListFooter>{pager(LIST_ID)}</ListFooter>}
          >
            {/* Above the rows' buttons (z-10) as they scroll under it. */}
            <ListHead columns={COLUMNS} sticky className={LIGHT_HEAD}>
              <ListHeadCell>{t("Transaction")}</ListHeadCell>
              <ListHeadCell className="hidden xl:block">{t("Category")}</ListHeadCell>
              <ListHeadCell className="hidden xl:block">{t("Account@@wallet")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell>
                <span className="sr-only">{t("Actions")}</span>
              </ListHeadCell>
            </ListHead>
            {groups.map((group) => {
              const band = dayBand(group.day, group.net);
              return (
                <div key={group.day} role="rowgroup">
                  <ListGroupRow label={dayHeading(group.day, today, t, locale)} aside={band.note ? <span className="font-medium text-ink-muted">{band.note}</span> : netText(band.net ?? 0)} />
                  {group.rows.map((row) => (
                    <DesktopRow key={row.transaction.id} row={row} currency={currency} canManage={canManage} onVoid={() => setVoiding(row)} />
                  ))}
                </div>
              );
            })}
          </ListCard>

          {/* Phone: a day heading, then a card of rows, per day. Named, as
              the pager focuses it after a page change. */}
          <div id={PHONE_LIST_ID} role="region" aria-label={t("Transactions")} aria-busy={isPending || undefined} className={cn("flex scroll-mt-4 flex-col transition-opacity md:hidden", isPending && "opacity-60")}>
            {groups.map((group) => {
              const band = dayBand(group.day, group.net);
              return (
                <div key={group.day}>
                  <div className="flex justify-between gap-3 px-1 pt-4 pb-2 text-small font-semibold text-ink-2">
                    <span>{dayHeading(group.day, today, t, locale)}</span>
                    {band.note ? <span className="font-medium text-ink-muted">{band.note}</span> : netText(band.net ?? 0)}
                  </div>
                  <Card padding="none" elevated={false} className="overflow-hidden">
                    {group.rows.map((row, index) => (
                      <PhoneRow key={row.transaction.id} row={row} currency={currency} divided={index > 0} />
                    ))}
                  </Card>
                </div>
              );
            })}
            <div className="px-1 pt-3">{pager(PHONE_LIST_ID)}</div>
          </div>
        </>
      )}

      {canManage && <TransactionDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} currency={currency} />}
      {voiding && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.transaction.id}
          title={rowTitle(voiding, t)}
        />
      )}
    </PageFrame>
  );
}

// The money in and out figures: 18px bold on a 1.2 line on phones, the
// h2 on wider screens.
const PHONE_FIGURE = "text-h3 max-md:leading-[1.2] font-bold md:text-[20px]";

// The desktop board says Income and Expense; the phone board, Money in and
// Money out (phoneLabel).
function TotalCell({ label, phoneLabel = label, children, divided = false, className }: { label: string; phoneLabel?: string; children: React.ReactNode; divided?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 md:px-5 md:py-4", divided && "md:border-l md:border-line", className)}>
      <span className="text-small font-normal text-ink-muted md:hidden">{phoneLabel}</span>
      <span className="text-caption text-ink-muted max-md:hidden">{label}</span>
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

function DesktopRow({ row, currency, canManage, onVoid }: { row: TransactionRow; currency: string; canManage: boolean; onVoid: () => void }) {
  const { t } = useLocale();
  const href = `/transactions/${row.transaction.id}`;
  const tone = row.transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  const title = rowTitle(row, t);
  const category = row.category && categoryLabel(row.category.name, t);
  const details = [category, row.wallet].filter(Boolean).join(" · ");
  return (
    // A voided row fades to 60% as the board sets it back; its hover
    // buttons stay solid.
    <ListRow columns={COLUMNS} muted={!!row.cancelled} className={cn("group", row.cancelled && "[&>[role=cell]:not([data-slot=list-row-actions])]:opacity-60")}>
      <ListCell className="flex min-w-0 items-center gap-3">
        <CategoryTile row={row} />
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <ListRowLink href={href} className={cn("truncate text-body font-medium text-ink", row.cancelled && "line-through")}>
              {title}
            </ListRowLink>
            {row.cancelled && (
              <Chip tone="expense" size="sm" className="h-auto py-0.5 text-[11px] font-semibold">
                {t(row.cancelled)}
              </Chip>
            )}
          </span>
          {details && <span className="truncate text-caption text-ink-muted xl:hidden">{details}</span>}
        </span>
      </ListCell>
      <ListCell className="hidden xl:block">
        {category && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-table-head px-2.5 py-0.75 text-caption font-medium text-ink-2">
            <span className={cn("size-2 shrink-0 rounded-full bg-current", tone.fg)} />
            <span className="truncate">{category}</span>
          </span>
        )}
      </ListCell>
      <ListCell className="hidden truncate text-small text-ink-soft xl:block">{row.wallet ?? "—"}</ListCell>
      <ListCell align="end">
        <AmountText
          value={row.signedAmount}
          currency={currency}
          signed={row.transaction.transactionType !== "TRANSFER"}
          tone={row.cancelled ? "neutral" : row.transaction.transactionType === "TRANSFER" ? "neutral" : "auto"}
          size="sm"
          className={cn(row.cancelled && "text-ink-muted line-through")}
        />
      </ListCell>
      <ListRowActions className={HOVER_ACTIONS}>
        <Link href={href} aria-label={t("View details")} title={t("View details")} className={cn(ROW_ACTION, "text-ink-soft hover:bg-surface-sunken")}>
          <Eye className="size-3.75" aria-hidden="true" />
        </Link>
        {canManage && row.transaction.voidable && (
          <button type="button" onClick={onVoid} aria-label={t("Void transaction")} title={t("Void transaction")} className={cn(ROW_ACTION, "text-expense-fill hover:bg-expense-soft")}>
            <CircleOff className="size-3.75" aria-hidden="true" />
          </button>
        )}
      </ListRowActions>
    </ListRow>
  );
}

function PhoneRow({ row, currency, divided }: { row: TransactionRow; currency: string; divided: boolean }) {
  const { t } = useLocale();
  return (
    <Link href={`/transactions/${row.transaction.id}`} className={cn("box-content grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 px-4", divided && "border-t border-divider", row.cancelled && "opacity-60")}>
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

// Three faded rows with one lit, as the empty board draws it.
function EmptyIllustration() {
  return (
    <div aria-hidden="true" className="relative mb-2 h-24 w-30">
      <div className="absolute top-3.5 left-2.5 h-5.5 w-25 rounded-sm bg-surface-sunken" />
      <div className="absolute top-10.5 left-0 flex h-7 w-30 items-center gap-2 rounded-md border border-line bg-surface px-2 shadow-[0_6px_16px_rgba(14,26,22,0.08)]">
        <span className="size-4 rounded-full bg-mint-50" />
        <span className="h-1.5 flex-1 rounded-[3px] bg-surface-sunken" />
        <span className="h-1.5 w-5.5 rounded-[3px] bg-mint-300" />
      </div>
      <div className="absolute top-19 left-2.5 h-5 w-25 rounded-sm bg-surface-sunken" />
    </div>
  );
}
