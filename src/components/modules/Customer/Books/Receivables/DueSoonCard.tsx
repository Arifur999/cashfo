"use client";

import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import type { DueSoonRow } from "@/lib/customer/api";
import { booksDate } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface DueSoonItem extends DueSoonRow {
  direction: "RECEIVABLE" | "PAYABLE";
}

interface DueSoonCardProps {
  items: DueSoonItem[];
  currency: string;
  canManage: boolean;
  today: string;
  // Opens the payment drawer on that supplier bill.
  onPay: (item: DueSoonItem) => void;
}

// What falls due in the next seven days, both ways, soonest first. Each row
// says in words which way the money goes, not by its colour alone.
export function DueSoonCard({ items, currency, canManage, today, onPay }: DueSoonCardProps) {
  const { t, locale } = useLocale();
  // Only a supplier bill has a button. When one is listed, every row takes
  // the table's own columns (a subgrid), so a customer's amount ends on the
  // same edge as a bill's, whatever the button's width in either language;
  // without one, the amount sits flush with the card's inset.
  const hasPay = canManage && items.some((item) => item.direction === "PAYABLE");
  const dueText = (item: DueSoonItem) => (item.daysUntilDue === 0 ? t("due today") : item.daysUntilDue === 1 ? t("due tomorrow") : t("due {date}", { date: booksDate(item.dueDate, locale, { today, weekday: true }) }));

  return (
    <ListCard
      label={t("Due in the next 7 days")}
      tableClassName={cn(hasPay && "grid grid-cols-[minmax(0,1fr)_auto_auto]")}
      header={
        <div className="border-b border-line px-4 py-4 md:px-6 md:py-5">
          <h2 className="text-h3 text-ink">{t("Due in the next 7 days")}</h2>
        </div>
      }
    >
      {items.length === 0 && <ListEmpty title={t("Nothing falls due in the next seven days.")} className="py-6" />}
      {items.map((item) => {
        const receivable = item.direction === "RECEIVABLE";
        return (
          <ListRow key={item.transactionId} className={cn(hasPay && "col-span-full grid-cols-subgrid")}>
            <ListCell className="flex min-w-0 items-center gap-3">
              <PersonAvatar name={item.contactName} size={36} coloured />
              <span className="flex min-w-0 flex-col gap-0.5">
                {/* The chip drops under the name when they don't fit side
                    by side, so a phone doesn't cut the name short. */}
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <ListRowLink href={`/contacts/${item.contactId}`} className="max-w-full truncate text-body font-semibold text-ink">
                    {item.contactName}
                  </ListRowLink>
                  <Chip tone={receivable ? "income" : "expense"} size="sm">
                    {t(receivable ? "They pay you" : "You pay")}
                  </Chip>
                </span>
                <span className="truncate text-small text-ink-muted">
                  {item.description ?? t(receivable ? "Sale" : "Purchase")} · {dueText(item)}
                </span>
              </span>
            </ListCell>
            <ListCell align="end">
              <b className={cn("tabular-nums whitespace-nowrap", receivable ? "text-income" : "text-expense")}>{formatCurrency(item.remainingAmount, currency, locale)}</b>
            </ListCell>
            {hasPay && (
              <ListRowActions>
                {!receivable && (
                  <Button variant="secondary" size="sm" onClick={() => onPay(item)} aria-label={t("Pay {name}", { name: item.contactName })} className="pointer-coarse:h-11">
                    {t("Pay@@bill")}
                  </Button>
                )}
              </ListRowActions>
            )}
          </ListRow>
        );
      })}
    </ListCard>
  );
}
