"use client";

import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import type { DueSoonRow } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface DueSoonItem extends DueSoonRow {
  direction: "RECEIVABLE" | "PAYABLE";
}

interface DueSoonCardProps {
  items: DueSoonItem[];
  currency: string;
  canManage: boolean;
  // Opens the payment drawer for a supplier bill.
  onPay: (item: DueSoonItem) => void;
}

// What falls due in the next seven days, both ways, soonest first.
export function DueSoonCard({ items, currency, canManage, onPay }: DueSoonCardProps) {
  const { t } = useLocale();
  const dueText = (item: DueSoonItem) => (item.daysUntilDue === 0 ? t("due today") : item.daysUntilDue === 1 ? t("due tomorrow") : `${t("due")} ${formatDate(item.dueDate, "EEE, d MMM")}`);

  return (
    <Card className="flex flex-col gap-1">
      <h3 className="text-h3 text-ink">{t("Due this week")}</h3>
      {items.length === 0 && <p className="py-3 text-small text-ink-muted">{t("Nothing falls due in the next seven days.")}</p>}
      {items.map((item, index) => {
        const receivable = item.direction === "RECEIVABLE";
        return (
          <div key={item.transactionId} className={cn("flex items-center gap-3 py-3", index > 0 && "border-t border-surface-sunken")}>
            <PersonAvatar name={item.contactName} size={36} coloured />
            <Link href={`/contacts/${item.contactId}`} className="flex min-w-0 flex-1 flex-col hover:underline">
              <span className="truncate text-body font-semibold text-ink">{item.contactName}</span>
              <span className="truncate text-small text-ink-muted">
                {item.description ?? t(receivable ? "Sale" : "Purchase")} · {dueText(item)}
              </span>
            </Link>
            <span className="flex shrink-0 items-center gap-3">
              <b className={cn("tabular-nums", receivable ? "text-income" : "text-expense")}>{formatCurrency(item.remainingAmount, currency)}</b>
              {canManage && !receivable && (
                <Button variant="secondary" size="sm" onClick={() => onPay(item)}>
                  {t("Pay")}
                </Button>
              )}
            </span>
          </div>
        );
      })}
    </Card>
  );
}
