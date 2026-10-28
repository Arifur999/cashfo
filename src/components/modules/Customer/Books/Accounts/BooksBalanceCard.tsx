"use client";

import { Scale } from "lucide-react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import type { BooksBalance } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BalanceText } from "../shared/BalanceText";

interface BooksBalanceCardProps {
  balance: BooksBalance;
  currency: string;
}

// The accounting equation as a sentence: what the business owns equals what
// it owes plus the owner's share, and whether the two sides agree. The
// opening balances accounts started with count in the owner's share, so a
// wallet opened with money in it never reads as a missing entry.
export function BooksBalanceCard({ balance, currency }: BooksBalanceCardProps) {
  const { t, fmt } = useLocale();
  // On a phone each term is one line, label left and figure right, so the
  // three don't stack into a column of display figures.
  const term = (label: string, value: number, note?: string) => (
    <span className="flex min-w-0 flex-col gap-1 max-sm:grid max-sm:w-full max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-baseline max-sm:gap-x-3 max-sm:gap-y-0.5">
      <span className="text-small text-ink-muted">{label}</span>
      <BalanceText value={value} currency={currency} className="text-h3 sm:text-h2" />
      {note && <span className="text-caption whitespace-normal text-ink-muted max-sm:col-span-2 max-sm:text-right">{note}</span>}
    </span>
  );
  // The = and + read as a sentence only when the three sit in one row.
  const sign = (symbol: string) => (
    <span aria-hidden="true" className="hidden text-h2 font-normal text-ink-faint sm:block">
      {symbol}
    </span>
  );

  return (
    <Card padding="none" className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center">
      <IconTile size={44} tone={balance.balanced ? "money" : "warning"} className="rounded-md">
        <Scale />
      </IconTile>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-body-lg font-bold text-ink">{t("Your books balance")}</b>
        <span className="text-small text-ink-muted">{t("What the business owns equals what it owes plus your share. If this ever stops matching, an entry is missing.")}</span>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-3 whitespace-nowrap max-sm:flex-col max-sm:items-stretch">
        {term(t("Owns"), balance.owns)}
        {sign("=")}
        {term(t("Owes"), balance.owes)}
        {sign("+")}
        {term(t("Your share"), balance.share, balance.opening !== 0 ? t("incl. {amount} opening balances", { amount: formatCurrency(balance.opening, currency, fmt) }) : undefined)}
        <Chip tone={balance.balanced ? "income" : "warning"} size="md" className="gap-2 self-start sm:self-center">
          <span className="size-1.75 rounded-full bg-current" aria-hidden="true" />
          {balance.balanced ? t("Balanced") : t("Off by {amount}", { amount: formatCurrency(Math.abs(balance.gap), currency, fmt) })}
        </Chip>
      </span>
    </Card>
  );
}
