"use client";

import { ArrowLeftRight, ArrowRight, Ban, Eye, Plus, Receipt, ReceiptText } from "lucide-react";
import Link from "next/link";
import { createElement, useState } from "react";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import type { Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { categoryLabel, describeTransaction, rowTitle, systemText, type CategoryMeta, type TransactionRow } from "@/lib/customer/transactionRows";
import { formatDay, toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./HomeHero";

interface RecentTransactionsCardProps {
  businessId: string;
  transactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;
  currency: string;
  canManage: boolean;
  // Opens the transaction drawer (the empty card's button).
  onAdd: () => void;
}

// The board: Transaction, Account, Date and Amount to the card's right edge.
// View and Void sit at the end of the name cell on hover.
const COLUMNS = "grid-cols-[minmax(0,1fr)_124px_72px_120px] gap-x-4";
// The phone board lists five.
const PHONE_ROWS = 5;
// The row's round View / Void buttons: shown on hover or focus, and always
// on a touch screen, so a tap never lands on an unseen Void.
const ROW_ACTION = "flex size-7.5 items-center justify-center rounded-full bg-surface ring-1 ring-line transition-colors [&_svg]:size-3.75";

// The newest transactions: the category's tile, what it was, the wallet,
// the day and the amount in its colour. A cancelled row is set back as on
// Transactions: struck through and grey, with its Voided chip.
export function RecentTransactionsCard({ businessId, transactions, categoriesById, currency, canManage, onAdd }: RecentTransactionsCardProps) {
  const { t, locale, fmt } = useLocale();
  const [voiding, setVoiding] = useState<TransactionRow | null>(null);
  const dayMonth = (day: string) => formatDay(day, "d MMM", fmt);
  const rows = transactions.map((transaction) => describeTransaction(transaction, categoriesById, {}, locale));

  const viewAll = (
    <Link href="/transactions" className="flex items-center gap-1 py-2 text-[13px] leading-[normal] font-semibold text-emerald hover:text-emerald-hover md:py-0">
      {t("View all")}
      <ArrowRight className="hidden size-3.5 md:block" strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );

  if (rows.length === 0) {
    return (
      <section className={cn(CARD, "flex flex-col overflow-hidden xl:col-span-2")}>
        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-5">
          <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Recent transactions")}</h2>
        </div>
        <div className="flex grow flex-col items-center justify-center gap-2 border-t border-line px-6 pt-10 pb-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
            <ReceiptText className="size-6" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="mt-1 text-[15px] leading-[normal] font-semibold text-ink">{t("No transactions yet")}</span>
          <span className="max-w-90 text-[13px] leading-normal text-ink-muted">{t("Income and expenses you add will be listed here, newest first.")}</span>
          {canManage && (
            <button type="button" onClick={onAdd} className="mt-2 flex h-9.5 items-center gap-1.5 rounded-full bg-emerald px-4 text-body font-semibold text-on-action hover:bg-emerald-hover">
              <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
              {t("Add your first transaction")}
            </button>
          )}
        </div>
      </section>
    );
  }

  const look = (row: TransactionRow) => {
    const isTransfer = row.transaction.transactionType === "TRANSFER";
    const tone = isTransfer ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
    const icon = isTransfer ? ArrowLeftRight : row.category ? categoryIconFor(row.category) : Receipt;
    const title = row.title ? systemText(row.title, t) : t(TRANSACTION_TYPE_LABELS[row.transaction.transactionType]);
    const kind = isTransfer ? t("Transfer") : row.category ? categoryLabel(row.category.name, t) : t(TRANSACTION_TYPE_LABELS[row.transaction.transactionType]);
    const amount = isTransfer ? formatCurrency(Math.abs(row.signedAmount), currency, fmt) : formatSignedCurrency(row.signedAmount, currency, fmt);
    const amountTone = row.cancelled || isTransfer ? "text-ink-muted" : row.signedAmount >= 0 ? "text-emerald" : "text-expense";
    // The board's tile: the category's first letter in its colour.
    const letter = !isTransfer && row.category ? Array.from(categoryLabel(row.category.name, t).trim())[0]?.toUpperCase() : undefined;
    return { tone, icon, letter, title, kind, amount, amountTone, day: dayMonth(toDateInputValue(row.transaction.transactionDate)) };
  };

  return (
    <section className={cn(CARD, "flex flex-col overflow-hidden xl:col-span-2")}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-6 md:py-5">
        <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Recent transactions")}</h2>
        {viewAll}
      </div>

      {/* Desktop: the board's table. */}
      <div role="table" aria-label={t("Recent transactions")} className="hidden md:block">
        <div role="row" className={cn("grid border-y border-line bg-table-head px-5.5 py-2.5 text-caption font-medium text-ink-muted", COLUMNS)}>
          <span role="columnheader">{t("Transaction")}</span>
          <span role="columnheader">{t("Account")}</span>
          <span role="columnheader">{t("Date")}</span>
          <span role="columnheader" className="text-right">
            {t("Amount")}
          </span>
        </div>
        {rows.map((row) => {
          const v = look(row);
          return (
            <div key={row.transaction.id} role="row" className={cn("group grid h-14 items-center border-b border-divider px-5.5 transition-colors last:border-b-0 hover:bg-table-head", COLUMNS)}>
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.25", v.tone.bg, v.tone.fg, row.cancelled && "opacity-60")}>{v.letter ? <span aria-hidden="true" className="text-[13px] font-bold">{v.letter}</span> : createElement(v.icon, { strokeWidth: 2, "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link href={`/transactions/${row.transaction.id}`} className={cn("truncate text-body leading-[normal] font-medium text-ink hover:underline", row.cancelled && "text-ink-muted line-through")}>
                      {v.title}
                    </Link>
                    {row.cancelled && <span className="shrink-0 rounded-full bg-expense-soft px-1.5 py-px text-[11px] leading-[normal] font-semibold text-expense">{t(row.cancelled)}</span>}
                  </span>
                  <span className="truncate text-caption text-ink-muted">{v.kind}</span>
                </span>
                <span className="ml-auto flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                  <Link href={`/transactions/${row.transaction.id}`} aria-label={t("View details")} title={t("View details")} className={cn(ROW_ACTION, "text-ink-soft hover:bg-surface-sunken")}>
                    <Eye strokeWidth={2} aria-hidden="true" />
                  </Link>
                  {canManage && row.transaction.voidable && (
                    <button type="button" onClick={() => setVoiding(row)} aria-label={t("Void transaction")} title={t("Void transaction")} className={cn(ROW_ACTION, "text-expense-fill hover:bg-expense-soft")}>
                      <Ban strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
              <span role="cell" className="truncate text-[13px] leading-[normal] text-ink-soft">
                {row.wallet ?? "—"}
              </span>
              <span role="cell" className="text-[13px] leading-[normal] whitespace-nowrap text-ink-muted">
                {v.day}
              </span>
              <span role="cell" className={cn("text-right text-body leading-[normal] font-semibold whitespace-nowrap tabular-nums", v.amountTone, row.cancelled && "line-through")}>
                {v.amount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Phones: one link a row, the category and day under the title. */}
      <ul className="md:hidden">
        {rows.slice(0, PHONE_ROWS).map((row) => {
          const v = look(row);
          return (
            <li key={row.transaction.id}>
              <Link href={`/transactions/${row.transaction.id}`} className="flex min-h-15 items-center gap-3 border-t border-divider px-4 text-ink active:bg-table-head">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4", v.tone.bg, v.tone.fg, row.cancelled && "opacity-60")}>{v.letter ? <span aria-hidden="true" className="text-[13px] font-bold">{v.letter}</span> : createElement(v.icon, { strokeWidth: 2, "aria-hidden": true })}</span>
                <span className="flex min-w-0 grow flex-col gap-px">
                  <span className={cn("truncate text-body leading-[normal] font-medium", row.cancelled && "text-ink-muted line-through")}>{v.title}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {row.cancelled && <>{t(row.cancelled)} · </>}
                    {v.kind} · {v.day}
                  </span>
                </span>
                <span className={cn("text-body leading-[normal] font-semibold whitespace-nowrap tabular-nums", v.amountTone, row.cancelled && "line-through")}>{v.amount}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {voiding && (
        <VoidTransactionDialog open onClose={() => setVoiding(null)} businessId={businessId} transactionId={voiding.transaction.id} title={rowTitle(voiding, t)} />
      )}
    </section>
  );
}
