"use client";

import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { biggestPart, type NetWorth, type NetWorthParts } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const PART_LABELS: Record<keyof NetWorthParts, string> = {
  wallets: "Wallets",
  savings: "Savings goals",
  assets: "Assets",
  owedToYou: "Owed to you",
  youOwe: "You owe",
};

const PART_SENTENCE: Record<Exclude<keyof NetWorthParts, "youOwe">, string> = {
  wallets: "Most of it sits in your wallets.",
  savings: "Most of it is your savings.",
  assets: "Most of it is your assets.",
  owedToYou: "Most of it is money owed to you.",
};

interface NetWorthCardProps {
  worth: NetWorth;
  currency: string;
}

// "Net worth today": the one figure, what makes it up, and a bar that shows
// how much of the whole is yours against what you owe. Phones get the
// figure and its sentence alone.
export function NetWorthCard({ worth, currency }: NetWorthCardProps) {
  const { t } = useLocale();
  const biggest = biggestPart(worth);
  const parts: { key: keyof NetWorthParts; value: number }[] = [
    { key: "wallets", value: worth.wallets },
    { key: "savings", value: worth.savings },
    { key: "assets", value: worth.assets },
    { key: "owedToYou", value: worth.owedToYou },
    { key: "youOwe", value: worth.youOwe },
  ];

  return (
    <Card padding="none" className="grid items-center gap-1 p-4 md:grid-cols-[300px_minmax(0,1fr)] md:gap-8 md:p-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <h2 className="text-small text-ink-muted md:text-h3 md:text-ink">{t("Net worth today")}</h2>
        <AmountText value={worth.total} currency={currency} size="display" className={cn("text-h1 md:text-display", worth.total < 0 && "text-expense")} />
        <span className="text-caption font-normal text-ink-muted md:text-small">
          <span className="md:hidden">{t("Wallets, savings, assets and money owed to you, minus what you owe")}</span>
          <span className="hidden md:inline">
            {t("Everything you have and are owed, minus what you owe.")}
            {biggest && ` ${t(PART_SENTENCE[biggest])}`}
          </span>
        </span>
      </div>
      <div className="hidden flex-col gap-3 md:flex">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-3">
          {parts.map((part) => (
            <span key={part.key} className="flex flex-col gap-1 rounded-md bg-cream px-4 py-3">
              <span className="text-caption font-normal text-ink-muted">{t(PART_LABELS[part.key])}</span>
              <AmountText value={part.key === "youOwe" ? -part.value : part.value} currency={currency} size="sm" tone={part.key === "youOwe" ? "expense" : "income"} signed className="font-bold" />
            </span>
          ))}
        </div>
        <div role="img" aria-label={`${t("What you have")} ${worth.haveShare}%, ${t("what you owe")} ${100 - worth.haveShare}%`} className="flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          <span className="bg-emerald" style={{ width: `${worth.haveShare}%` }} />
          <span className="bg-expense-fill" style={{ width: `${100 - worth.haveShare}%` }} />
        </div>
        <span className="text-caption font-normal text-ink-muted">
          {t("Green: what you have and are owed")}, {formatCurrency(worth.have, currency)} · {t("Red: what you owe")}, {formatCurrency(worth.youOwe, currency)}
        </span>
      </div>
    </Card>
  );
}
