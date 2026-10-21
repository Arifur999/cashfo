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
// lined up on the right and the total on the table's own band.
export function YearSummaryCard({ title, description, rows, total, currency }: YearSummaryCardProps) {
  const { t } = useLocale();

  return (
    <ListCard label={title} title={title} description={description} footer={null}>
      {rows.length === 0 ? (
        <ListEmpty title={t("Nothing posted yet this year.")} />
      ) : (
        <>
          {rows.map((row) => (
            <ListRow key={row.id} density="dense">
              <ListCell className="truncate text-ink-2">{row.name}</ListCell>
              <ListCell align="end" className="text-ink tabular-nums whitespace-nowrap">
                {formatCurrency(row.total, currency)}
              </ListCell>
            </ListRow>
          ))}
          <ListTotalRow label={t("Total")} value={formatCurrency(total, currency)} />
        </>
      )}
    </ListCard>
  );
}
