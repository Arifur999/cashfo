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
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { describeTransaction, relativeDayKey, type CategoryMeta } from "@/lib/customer/transactionRows";
import { toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;
  currency: string;
  today: string;
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
          const row = describeTransaction(transaction, categoriesById);
          const isTransfer = transaction.transactionType === "TRANSFER";
          const tone = isTransfer ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
          const icon = isTransfer ? ArrowLeftRight : row.category?.icon ? budgetCategoryIcon(row.category.icon) : Receipt;
          const when = relativeDayKey(toDateInputValue(transaction.transactionDate), today);
          const meta = [row.category?.name, row.wallet, when ? t(when) : formatDate(transaction.transactionDate, "EEE, d MMM")].filter(Boolean).join(" · ");
          return (
            <Link
              key={transaction.id}
              href={`/transactions/${transaction.id}`}
              className={cn("grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line px-5 transition-colors hover:bg-cream", row.cancelled && "opacity-60")}
            >
              <IconTile tone="neutral" className={cn(tone.bg, tone.fg)}>
                {createElement(icon)}
              </IconTile>
              <span className="flex min-w-0 flex-col py-2">
                <span className="flex items-center gap-2 truncate text-body font-semibold text-ink">
                  {row.title ?? t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}
                  {row.cancelled && (
                    <Chip tone="neutral" size="sm">
                      {t(row.cancelled)}
                    </Chip>
                  )}
                </span>
                <span className="truncate text-small text-ink-muted">{meta}</span>
              </span>
              <AmountText value={row.signedAmount} currency={currency} signed={!isTransfer} tone={isTransfer ? "neutral" : "auto"} size="md" className={cn("text-right font-bold", row.cancelled && "line-through")} />
            </Link>
          );
        })
      )}
    </Card>
  );
}
