"use client";

import { ListCard, ListCell, ListEmpty, ListRow, ListTotalRow } from "@/components/smartly/list";
import type { YearRow } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface YearSummaryCardProps {
  title: string;
  description: string;
  rows: YearRow[];
  total: number;
  currency: string;
}

// This year's income or expenses by account, largest first, the amounts
// lined up on the right and the total on the table's own band. The card
// fills its grid cell and its Total band sits at the bottom, so the income
// and expense cards end level whatever their row counts.
export function YearSummaryCard({ title, description, rows, total, currency }: YearSummaryCardProps) {
  const { t, locale } = useLocale();

  return (
    <ListCard label={title} title={title} description={description} footer={null} className="flex flex-col" tableClassName="flex flex-1 flex-col">
      {rows.length === 0 ? (
        <ListEmpty title={t("Nothing posted yet this year.")} />
      ) : (
        <>
          {rows.map((row) => (
            <ListRow key={row.id} density="dense">
              <ListCell className="truncate text-ink-2">{row.name}</ListCell>
              <ListCell align="end" className="text-ink tabular-nums whitespace-nowrap">
                {formatCurrency(row.total, currency, locale)}
              </ListCell>
            </ListRow>
          ))}
          <ListTotalRow label={t("Total")} value={formatCurrency(total, currency, locale)} className="mt-auto" />
        </>
      )}
    </ListCard>
  );
}
