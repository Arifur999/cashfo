"use client";

import { ArrowLeftRight, Receipt } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import type { Transaction } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatDate } from "@/lib/customer/date";
import { cancelledLabel, TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { CategoryMeta } from "./homeTypes";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;
  currency: string;
  today: string;
}

const shiftDay = (day: string, delta: number) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

// "Today", "Yesterday", else "Wed, 30 Sep".
export function relativeDay(dateIso: string, today: string, t: (key: string) => string): string {
  const day = toDateInputValue(dateIso);
  if (day === today) return t("Today");
  if (day === shiftDay(today, -1)) return t("Yesterday");
  return formatDate(dateIso, "EEE, d MMM");
}

// Which entry carries the category, and which the wallet -- entry order
// differs between an income and an expense.
function describe(transaction: Transaction, categoriesById: Record<string, CategoryMeta>) {
  const categoryEntry = transaction.entries.find((e) => e.categoryId);
  const category = categoryEntry?.categoryId ? categoriesById[categoryEntry.categoryId] : undefined;
  const wallet = categoryEntry ? transaction.entries.find((e) => e.id !== categoryEntry.id)?.account?.name : undefined;
  if (transaction.transactionType === "TRANSFER") {
    const from = transaction.entries.find((e) => e.entryType === "CREDIT")?.account?.name;
    const to = transaction.entries.find((e) => e.entryType === "DEBIT")?.account?.name;
    return { category, wallet: from && to ? `${from} → ${to}` : wallet };
  }
  return { category, wallet: wallet ?? transaction.entries[0]?.account?.name };
}

// The latest transactions, one row each: the category's tile, what it
// was, where and when, and the amount in its colour.
export function RecentTransactionsCard({ transactions, categoriesById, currency, today }: RecentTransactionsCardProps) {
  const { t } = useLocale();
  const oldest = transactions[transactions.length - 1];

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-h3 text-ink">{t("Recent transactions")}</h3>
        {oldest && (
          <span className="text-small text-ink-muted">
            {t("Since")} {formatDate(oldest.transactionDate, "d MMM")}
          </span>
        )}
      </div>
      {transactions.length === 0 ? (
        <p className="border-t border-line px-5 py-10 text-center text-body text-ink-muted">{t("No transactions yet.")}</p>
      ) : (
        transactions.map((transaction) => {
          const { category, wallet } = describe(transaction, categoriesById);
          const tone = transaction.transactionType === "TRANSFER" ? NEUTRAL_CATEGORY_TONE : categoryTone(category?.color);
          const icon = transaction.transactionType === "TRANSFER" ? ArrowLeftRight : category?.icon ? budgetCategoryIcon(category.icon) : Receipt;
          const amount = Number(transaction.entries[0]?.amount ?? 0);
          const signed = transaction.transactionType === "INCOME" ? amount : transaction.transactionType === "EXPENSE" ? -amount : amount;
          const cancelled = cancelledLabel(transaction);
          const meta = [category?.name, wallet, relativeDay(transaction.transactionDate, today, t)].filter(Boolean).join(" · ");
          return (
            <Link
              key={transaction.id}
              href={`/transactions/${transaction.id}`}
              className={cn("grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line px-5 transition-colors hover:bg-cream", cancelled && "opacity-60")}
            >
              <IconTile tone="neutral" className={cn(tone.bg, tone.fg)}>
                {createElement(icon)}
              </IconTile>
              <span className="flex min-w-0 flex-col py-2">
                <span className="flex items-center gap-2 truncate text-body font-semibold text-ink">
                  {transaction.description || category?.name || t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}
                  {cancelled && (
                    <Chip tone="neutral" size="sm">
                      {t(cancelled)}
                    </Chip>
                  )}
                </span>
                <span className="truncate text-small text-ink-muted">{meta}</span>
              </span>
              <AmountText
                value={signed}
                currency={currency}
                signed={transaction.transactionType !== "TRANSFER"}
                tone={transaction.transactionType === "TRANSFER" ? "neutral" : "auto"}
                size="md"
                className={cn("text-right font-bold", cancelled && "line-through")}
              />
            </Link>
          );
        })
      )}
    </Card>
  );
}
