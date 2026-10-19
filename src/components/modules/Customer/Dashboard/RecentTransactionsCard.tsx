"use client";

import { ArrowLeftRight, Receipt } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import type { Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
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
// was, where and when, and the amount in its colour. Phones show four rows
// under Home's own "Recent transactions" heading, without the category. A
// row is 64px tall plus its divider (box-content), as the boards draw it.
const PHONE_ROWS = 4;

export function RecentTransactionsCard({ transactions, categoriesById, currency, today }: RecentTransactionsCardProps) {
  const { t } = useLocale();
  const oldest = transactions[transactions.length - 1];

  return (
    <Card padding="none" className="flex flex-col overflow-hidden max-md:shadow-none">
      <div className="hidden items-center justify-between px-5 pt-5 pb-3 md:flex">
        <h3 className="text-h3 leading-6 text-ink">{t("Recent transactions")}</h3>
        {oldest && (
          <span className="text-small text-ink-muted">
            {t("Since")} {formatDate(oldest.transactionDate, "d MMM")}
          </span>
        )}
      </div>
      {transactions.length === 0 ? (
        <p className="px-5 py-10 text-center text-body text-ink-muted md:border-t md:border-line">{t("No transactions yet.")}</p>
      ) : (
        transactions.map((transaction, index) => {
          const row = describeTransaction(transaction, categoriesById);
          const isTransfer = transaction.transactionType === "TRANSFER";
          const tone = isTransfer ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
          const icon = isTransfer ? ArrowLeftRight : row.category ? categoryIconFor(row.category) : Receipt;
          const when = relativeDayKey(toDateInputValue(transaction.transactionDate), today);
          const whereAndWhen = [row.wallet, when ? t(when) : formatDate(transaction.transactionDate, "EEE, d MMM")].filter(Boolean).join(" · ");
          return (
            <Link
              key={transaction.id}
              href={`/transactions/${transaction.id}`}
              className={cn(
                "box-content grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line px-4 transition-colors hover:bg-cream max-md:first-of-type:border-t-0 md:px-5",
                row.cancelled && "opacity-60",
                index >= PHONE_ROWS && "hidden md:grid",
              )}
            >
              <IconTile tone="neutral" className={cn(tone.bg, tone.fg)}>
                {createElement(icon)}
              </IconTile>
              <span className="flex min-w-0 flex-col py-2">
                <span className="flex items-center gap-2 truncate text-body leading-5 font-semibold text-ink">
                  {row.title ?? t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}
                  {row.cancelled && (
                    <Chip tone="neutral" size="sm">
                      {t(row.cancelled)}
                    </Chip>
                  )}
                </span>
                <span className="truncate text-small leading-4.5 text-ink-muted">
                  {row.category && <span className="hidden md:inline">{row.category.name} · </span>}
                  {whereAndWhen}
                </span>
              </span>
              <AmountText value={row.signedAmount} currency={currency} signed={!isTransfer} tone={isTransfer ? "neutral" : "auto"} size="md" className={cn("text-right leading-5.5 font-bold", row.cancelled && "line-through")} />
            </Link>
          );
        })
      )}
    </Card>
  );
}
