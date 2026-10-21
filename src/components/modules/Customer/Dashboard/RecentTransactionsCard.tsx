"use client";

import { ArrowLeftRight, Receipt } from "lucide-react";
import { createElement } from "react";
import AmountText from "@/components/smartly/AmountText";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { ListCard, ListCell, ListEmpty, ListRow, ListRowLink } from "@/components/smartly/list";
import type { Transaction } from "@/lib/customer/api";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "@/lib/customer/categoryTone";
import { formatDate } from "@/lib/customer/date";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { describeTransaction, relativeDayKey, type CategoryMeta } from "@/lib/customer/transactionRows";
import { toDateInputValue } from "@/lib/date";
import { banglaDayMonth, banglaShortDay } from "@/lib/i18n/banglaDates";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categoriesById: Record<string, CategoryMeta>;
  currency: string;
  today: string;
}

// The latest transactions, one row each on the shared list rows (their
// divider, hover and focus ring): the category's tile, what it was, where
// and when, and the amount in its colour. Phones show four rows under
// Home's own "Recent transactions" heading, without the category. A
// cancelled row is set back as on Transactions: struck through, its
// amount grey, with a red Voided chip (on phones, the word in the line
// under the title, where a long title can't push it out of sight).
const PHONE_ROWS = 4;
const COLUMNS = "grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3";

export function RecentTransactionsCard({ transactions, categoriesById, currency, today }: RecentTransactionsCardProps) {
  const { t, locale } = useLocale();
  const oldest = transactions[transactions.length - 1];
  // "30 Sep" / "Wed, 30 Sep", or the Bangla board's own short words.
  const dayMonth = (day: string) => (locale === "bn" ? banglaDayMonth(day) : formatDate(`${day}T00:00:00.000Z`, "d MMM"));
  const shortDay = (day: string) => (locale === "bn" ? banglaShortDay(day) : formatDate(`${day}T00:00:00.000Z`, "EEE, d MMM"));

  return (
    <ListCard
      label={t("Recent transactions")}
      className="flex flex-col max-md:shadow-none"
      header={
        <div className="hidden items-center justify-between gap-3 border-b border-line px-4 pt-5 pb-3 md:flex md:px-6">
          <h3 className="text-h3 leading-6 text-ink">{t("Recent transactions")}</h3>
          {oldest && <span className="text-small text-ink-muted">{t("Since {date}", { date: dayMonth(toDateInputValue(oldest.transactionDate)) })}</span>}
        </div>
      }
    >
      {transactions.length === 0 ? (
        <ListEmpty title={t("No transactions yet.")} />
      ) : (
        transactions.map((transaction, index) => {
          const row = describeTransaction(transaction, categoriesById);
          const isTransfer = transaction.transactionType === "TRANSFER";
          const tone = isTransfer ? NEUTRAL_CATEGORY_TONE : categoryTone(row.category?.color);
          const icon = isTransfer ? ArrowLeftRight : row.category ? categoryIconFor(row.category) : Receipt;
          const day = toDateInputValue(transaction.transactionDate);
          const when = relativeDayKey(day, today);
          const whereAndWhen = [row.wallet, when ? t(when) : shortDay(day)].filter(Boolean).join(" · ");
          return (
            <ListRow key={transaction.id} density="relaxed" muted={Boolean(row.cancelled)} columns={COLUMNS} className={cn(index >= PHONE_ROWS && "hidden md:grid")}>
              <ListCell>
                <IconTile tone="neutral" className={cn(tone.bg, tone.fg)}>
                  {createElement(icon)}
                </IconTile>
              </ListCell>
              <ListCell className="flex flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <ListRowLink href={`/transactions/${transaction.id}`} className={cn("truncate text-body leading-5 font-semibold text-ink", row.cancelled && "line-through")}>
                    {row.title ?? t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}
                  </ListRowLink>
                  {row.cancelled && (
                    <Chip tone="expense" size="sm" className="hidden font-semibold md:inline-flex">
                      {t(row.cancelled)}
                    </Chip>
                  )}
                </span>
                <span className="truncate text-small leading-4.5 text-ink-muted">
                  {row.cancelled && <span className="md:hidden">{t(row.cancelled)} · </span>}
                  {row.category && <span className="hidden md:inline">{row.category.name} · </span>}
                  {whereAndWhen}
                </span>
              </ListCell>
              <ListCell align="end">
                <AmountText
                  value={row.signedAmount}
                  currency={currency}
                  signed={!isTransfer}
                  tone={row.cancelled || isTransfer ? "neutral" : "auto"}
                  size="md"
                  className={cn("leading-5.5 font-bold whitespace-nowrap", row.cancelled && "text-ink-muted line-through")}
                />
              </ListCell>
            </ListRow>
          );
        })
      )}
    </ListCard>
  );
}
