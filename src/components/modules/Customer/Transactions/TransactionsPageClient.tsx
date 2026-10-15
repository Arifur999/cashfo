"use client";

import { ChevronLeft, ChevronRight, CircleOff, Eye, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useState } from "react";
import { TransactionDrawer } from "@/components/modules/Customer/QuickEntry/TransactionDrawer";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Account, Transaction } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatSignedCurrency } from "@/lib/customer/currency";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { categoryIndex, dayHeading, describeTransaction, groupByDay, type TransactionRow } from "@/lib/customer/transactionRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TransactionFilters } from "./TransactionFilters";
import { VoidTransactionDialog } from "./VoidTransactionDialog";

export interface TransactionTotals {
  income: number;
  expense: number;
  count: number;
  voided: number;
  // "all": every matching transaction (from the category breakdown);
  // "page": only the rows on this page, when a filter the breakdown can't
  // apply (search, wallet, category) is on.
  scope: "all" | "page";
}

interface TransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: { id: string; name: string; icon: string | null; color: string }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  currency: string;
  today: string;
  totals: TransactionTotals;
  canManage: boolean;
}

const GRID = "md:grid-cols-[minmax(0,1fr)_190px_160px_140px_80px]";

// Transactions: the filters, the totals strip, and the list grouped by
// day with each day's net, newest first.
export function TransactionsPageClient({ businessId, transactions, accounts, categories, meta, currency, today, totals, canManage }: TransactionsPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [voiding, setVoiding] = useState<TransactionRow | null>(null);

  const categoriesById = categoryIndex(categories);
  const groups = groupByDay(transactions.map((transaction) => describeTransaction(transaction, categoriesById)));
  const filtered = searchParams.toString().replace(/page=\d+&?/, "") !== "";

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    router.push(`/transactions?${next.toString()}`);
  }

  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);

  return (
    <PageFrame>
      <PageHeader
        eyebrow={t("Money")}
        title={t("Transactions")}
        description={t("Every income and expense you've added, newest first.")}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus strokeWidth={2.5} className="size-4" />
            {t("New transaction")}
          </Button>
        }
        className="mb-1"
      />

      <TransactionFilters accounts={accounts} categories={categories} />

      <Card padding="none" className="grid grid-cols-2 md:grid-cols-4">
        <TotalCell label={t("Money in")}>
          <AmountText value={totals.income} currency={currency} size="h2" tone="income" signed className="text-h3 md:text-h2" />
        </TotalCell>
        <TotalCell label={t("Money out")} divided>
          <AmountText value={-totals.expense} currency={currency} size="h2" tone="expense" signed className="text-h3 md:text-h2" />
        </TotalCell>
        <TotalCell label={t("Net")} divided className="border-t md:border-t-0">
          <AmountText value={totals.income - totals.expense} currency={currency} size="h2" signed className="text-h3 md:text-h2" />
        </TotalCell>
        <TotalCell label={t("Transactions")} divided className="border-t md:border-t-0">
          <span className="text-h3 text-ink tabular-nums md:text-h2">
            {totals.count}
            {totals.voided > 0 && (
              <span className="text-small font-medium text-ink-muted">
                {" "}
                · {totals.voided} {t("voided")}
              </span>
            )}
            {totals.scope === "page" && <span className="text-small font-medium text-ink-muted"> · {t("this page")}</span>}
          </span>
        </TotalCell>
      </Card>

      {transactions.length === 0 ? (
        <Card padding="none" className="flex min-h-140 flex-col items-center justify-center gap-3 p-10 text-center">
          <EmptyIllustration />
          <h2 className="text-h3 text-ink">{filtered ? t("Nothing matches these filters") : t("No transactions yet")}</h2>
          <p className="max-w-105 text-body leading-relaxed text-ink-muted">
            {filtered ? t("Try a wider date range, or clear the filters.") : t("Add your first income or expense. It takes a few seconds, and your dashboard, budget and reports fill in from here.")}
          </p>
          <div className="mt-3 flex gap-3">
            <Button variant="action" onClick={() => setAddOpen(true)}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("New transaction")}
            </Button>
            {filtered ? (
              <Button variant="secondary" asChild>
                <Link href="/transactions">{t("Clear filters")}</Link>
              </Button>
            ) : (
              <Button variant="secondary" asChild>
                <Link href="/balance/wallet">{t("Add a wallet first")}</Link>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop: one card with the column heads and the day groups. */}
          <Card padding="none" className="hidden overflow-hidden md:block">
            <div className={cn("grid items-center gap-x-4 border-b border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
              <span>{t("Transaction")}</span>
              <span>{t("Category")}</span>
              <span>{t("Wallet")}</span>
              <span className="text-right">{t("Amount")}</span>
              <span />
            </div>
            {groups.map((group) => (
              <div key={group.day}>
                <div className="flex h-9.5 items-center justify-between border-b border-surface-sunken bg-cream px-6 text-caption font-semibold">
                  <span className="text-ink-2">{dayHeading(group.day, today, t)}</span>
                  <span className={cn("tabular-nums", group.net >= 0 ? "text-income" : "text-expense")}>{formatSignedCurrency(group.net, currency)}</span>
                </div>
                {group.rows.map((row) => (
                  <DesktopRow key={row.transaction.id} row={row} currency={currency} canManage={canManage} onVoid={() => setVoiding(row)} />
                ))}
              </div>
            ))}
            <Pagination page={meta.page} totalPages={meta.totalPages} rangeStart={rangeStart} rangeEnd={rangeEnd} total={meta.total} onPage={goToPage} />
          </Card>

          {/* Phone: a day heading, then a card of rows, per day. */}
          <div className="flex flex-col md:hidden">
            {groups.map((group) => (
              <div key={group.day}>
                <div className="flex justify-between px-1 pt-4 pb-2 text-small font-semibold text-ink-2">
                  <span>{dayHeading(group.day, today, t)}</span>
                  <span className={cn("tabular-nums", group.net >= 0 ? "text-income" : "text-expense")}>{formatSignedCurrency(group.net, currency)}</span>
                </div>
                <Card padding="none" elevated={false} className="overflow-hidden">
                  {group.rows.map((row, index) => (
                    <PhoneRow key={row.transaction.id} row={row} currency={currency} divided={index > 0} />
                  ))}
                </Card>
              </div>
            ))}
            <Pagination page={meta.page} totalPages={meta.totalPages} rangeStart={rangeStart} rangeEnd={rangeEnd} total={meta.total} onPage={goToPage} className="px-1" />
          </div>
        </>
      )}

      <TransactionDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} currency={currency} />
      {voiding && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.transaction.id}
          title={voiding.title ?? t(TRANSACTION_TYPE_LABELS[voiding.transaction.transactionType])}
        />
      )}
    </PageFrame>
  );
}

function TotalCell({ label, children, divided = false, className }: { label: string; children: React.ReactNode; divided?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 md:px-5 md:py-4", divided && "md:border-l md:border-line", className)}>
      <span className="text-caption font-normal text-ink-muted md:text-small">{label}</span>
      {children}
    </div>
  );
}

function CategoryTile({ row, size = 36 }: { row: TransactionRow; size?: 36 | 40 }) {
  const tone = row.transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  const icon = row.category?.icon ? budgetCategoryIcon(row.category.icon) : Receipt;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", size === 40 ? "size-10 rounded-md [&_svg]:size-4.5" : "size-9 rounded-full [&_svg]:size-4.25", tone.bg, tone.fg)}>
      {createElement(icon, { "aria-hidden": true })}
    </span>
  );
}

function DesktopRow({ row, currency, canManage, onVoid }: { row: TransactionRow; currency: string; canManage: boolean; onVoid: () => void }) {
  const { t } = useLocale();
  const href = `/transactions/${row.transaction.id}`;
  const tone = row.transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
  return (
    <div className={cn("group grid h-14 items-center gap-x-4 border-b border-surface-sunken px-6 transition-colors hover:bg-cream", GRID, row.cancelled && "opacity-60")}>
      <Link href={href} className="flex min-w-0 items-center gap-3">
        <CategoryTile row={row} />
        <span className={cn("truncate text-body font-medium text-ink", row.cancelled && "line-through")}>{row.title ?? t(TRANSACTION_TYPE_LABELS[row.transaction.transactionType])}</span>
        {row.cancelled && (
          <Chip tone="expense" size="sm" className="font-semibold">
            {t(row.cancelled)}
          </Chip>
        )}
      </Link>
      <span className="min-w-0">
        {row.category && (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-cream px-3 py-0.75 text-caption text-ink-2">
            <span className={cn("size-2 shrink-0 rounded-full bg-current", tone.fg)} />
            <span className="truncate">{row.category.name}</span>
          </span>
        )}
      </span>
      <span className="truncate text-small text-ink-2">{row.wallet ?? "—"}</span>
      <AmountText
        value={row.signedAmount}
        currency={currency}
        signed={row.transaction.transactionType !== "TRANSFER"}
        tone={row.cancelled ? "neutral" : row.transaction.transactionType === "TRANSFER" ? "neutral" : "auto"}
        size="sm"
        className={cn("text-right", row.cancelled && "text-ink-muted line-through")}
      />
      <span className="flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Link href={href} aria-label={t("View details")} title={t("View details")} className="flex size-8 items-center justify-center rounded-md bg-surface text-ink-2 shadow-[0_0_0_1px_var(--line)] hover:bg-cream">
          <Eye className="size-3.75" aria-hidden="true" />
        </Link>
        {canManage && row.transaction.voidable && (
          <button type="button" onClick={onVoid} aria-label={t("Void transaction")} title={t("Void transaction")} className="flex size-8 items-center justify-center rounded-md bg-surface text-expense shadow-[0_0_0_1px_var(--line)] hover:bg-expense-soft">
            <CircleOff className="size-3.75" aria-hidden="true" />
          </button>
        )}
      </span>
    </div>
  );
}

function PhoneRow({ row, currency, divided }: { row: TransactionRow; currency: string; divided: boolean }) {
  const { t } = useLocale();
  return (
    <Link href={`/transactions/${row.transaction.id}`} className={cn("grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 px-4", divided && "border-t border-surface-sunken", row.cancelled && "opacity-60")}>
      <CategoryTile row={row} size={40} />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate text-title text-ink", row.cancelled && "line-through")}>{row.title ?? t(TRANSACTION_TYPE_LABELS[row.transaction.transactionType])}</span>
        <span className="truncate text-small text-ink-muted">{[row.cancelled && t(row.cancelled), row.category?.name, row.wallet].filter(Boolean).join(" · ")}</span>
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

function Pagination({ page, totalPages, rangeStart, rangeEnd, total, onPage, className }: { page: number; totalPages: number; rangeStart: number; rangeEnd: number; total: number; onPage: (page: number) => void; className?: string }) {
  const { t } = useLocale();
  return (
    <div className={cn("flex items-center justify-between px-6 py-3 text-small text-ink-muted", className)}>
      <span>
        {t("Showing")} {rangeStart}–{rangeEnd} {t("of")} {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("Previous page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span aria-current="page" className="flex size-8 items-center justify-center rounded-md bg-emerald font-semibold text-white">
          {page}
        </span>
        {totalPages > page && <span className="px-1">/ {totalPages}</span>}
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("Next page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
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
