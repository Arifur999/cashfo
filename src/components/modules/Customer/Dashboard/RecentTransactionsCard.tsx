"use client";

import { ArrowLeftRight, ArrowRight, Plus, Receipt, ReceiptText } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import type { Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { categoryLabel, describeTransaction, systemText, type CategoryMeta, type TransactionRow } from "@/lib/customer/transactionRows";
import { formatDay, toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BOARD_CARD } from "./DashboardCards";
import { CARD } from "./HomeHero";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;
  currency: string;
  canManage: boolean;
  // Opens the transaction drawer (the empty card's button).
  onAdd: () => void;
}

// The Dashboard board: Transaction, Account, Date and Amount to the card's
// right edge.
const COLUMNS = "grid-cols-[minmax(0,1fr)_130px_80px_120px] gap-x-3";
// The phone board lists five.
const PHONE_ROWS = 5;

// The newest transactions: the category's tile, what it was, the wallet,
// the day and the amount in its colour. A cancelled row is set back as on
// Transactions: struck through and grey, with its Voided chip.
export function RecentTransactionsCard({ transactions, categoriesById, currency, canManage, onAdd }: RecentTransactionsCardProps) {
  const { t, locale, fmt } = useLocale();
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
    const amountTone = row.cancelled || isTransfer ? "text-ink-muted" : row.signedAmount >= 0 ? "text-tint-green-ink" : "text-loss-ink";
    // The phone board draws them in the primary and the expense red.
    const phoneTone = row.cancelled || isTransfer ? "text-ink-muted" : row.signedAmount >= 0 ? "text-emerald" : "text-expense-fill";
    // The board's tile: the category's first letter in its colour.
    const letter = !isTransfer && row.category ? Array.from(categoryLabel(row.category.name, t).trim())[0]?.toUpperCase() : undefined;
    return { tone, icon, letter, title, kind, amount, amountTone, phoneTone, day: dayMonth(toDateInputValue(row.transaction.transactionDate)) };
  };

  return (
    <section className={cn(BOARD_CARD, "flex flex-col overflow-hidden xl:col-span-2")}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 md:px-5.5 md:pt-4.5 md:pb-3">
        <h2 className="rp-h2 text-title leading-[normal] font-semibold text-ink md:text-[17px] md:tracking-[-0.01em]">{t("Recent transactions")}</h2>
        {viewAll}
      </div>

      {/* Desktop: the board's table. */}
      <div role="table" aria-label={t("Recent transactions")} className="hidden md:block">
        <div role="row" className={cn("rp-th grid border-y border-divider bg-table-head px-5 py-2 text-caption font-semibold text-ink-muted", COLUMNS)}>
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
            <div key={row.transaction.id} role="row" className={cn("grid min-h-[53px] items-center border-b border-divider px-5 text-body last:min-h-13 last:border-b-0", COLUMNS)}>
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4", v.tone.bg, v.tone.fg, row.cancelled && "opacity-60")}>{v.letter ? <span aria-hidden="true" className="text-[14px] font-bold">{v.letter}</span> : createElement(v.icon, { strokeWidth: 2, "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link href={`/transactions/${row.transaction.id}`} className={cn("truncate font-medium text-ink hover:underline", row.cancelled && "text-ink-muted line-through")}>
                      {v.title}
                    </Link>
                    {row.cancelled && <span className="shrink-0 rounded-full bg-expense-soft px-1.5 py-px text-[11px] font-semibold text-expense">{t(row.cancelled)}</span>}
                  </span>
                  <span className="truncate text-caption text-ink-faint">{v.kind}</span>
                </span>
              </div>
              <span role="cell" className="truncate text-small text-ink-2">
                {row.wallet ?? "–"}
              </span>
              <span role="cell" className="text-small whitespace-nowrap text-ink-muted">
                {v.day}
              </span>
              <span role="cell" className={cn("text-right font-semibold whitespace-nowrap tabular-nums", v.amountTone, row.cancelled && "line-through")}>
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
              <Link href={`/transactions/${row.transaction.id}`} className="flex min-h-[61px] items-center gap-3 border-t border-divider px-4 text-ink active:bg-table-head">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4", v.tone.bg, v.tone.fg, row.cancelled && "opacity-60")}>{createElement(v.icon, { strokeWidth: 2, "aria-hidden": true })}</span>
                <span className="flex min-w-0 grow flex-col gap-px">
                  <span className={cn("truncate text-body leading-[normal] font-medium", row.cancelled && "text-ink-muted line-through")}>{v.title}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {row.cancelled && <>{t(row.cancelled)} · </>}
                    {v.kind} · {v.day}
                  </span>
                </span>
                <span className={cn("text-body leading-[normal] font-semibold whitespace-nowrap tabular-nums", v.phoneTone, row.cancelled && "line-through")}>{v.amount}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
