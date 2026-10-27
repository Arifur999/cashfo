"use client";

import { FileDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { getBillingPaymentsAction } from "@/lib/customer/billingActions";
import { gatewayLabel, paymentStatusView, type BillingPayments } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const PAGE = 10;

// The customer's payments, newest first, each with its invoice once paid
// (a PDF through /api/invoices/:id, never the backend straight).
export function PaymentsCard({ initial }: { initial: BillingPayments }) {
  const { t, locale } = useLocale();
  const [rows, setRows] = useState(initial.data);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.meta.total);
  const [isPending, startTransition] = useTransition();

  // The page read again (a payment just started): the first page anew.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial.data);
    setPage(1);
    setTotal(initial.meta.total);
  }

  function more() {
    startTransition(async () => {
      const result = await getBillingPaymentsAction(page + 1, PAGE);
      if (result.success && result.data) {
        const seen = new Set(rows.map((row) => row.id));
        setRows([...rows, ...result.data.data.filter((row) => !seen.has(row.id))]);
        setPage(page + 1);
        setTotal(result.data.meta.total);
      } else {
        toast.error(t(result.message ?? "Couldn't load your payments"));
      }
    });
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-0.5 px-4 py-4 md:px-5.5">
        <h2 className="text-title font-semibold text-ink">{t("Your payments")}</h2>
        <span className="text-small text-ink-muted">{t("Every payment, with its invoice once it's paid.")}</span>
      </div>
      <ul>
        {rows.map((row) => {
          const status = paymentStatusView(row.status);
          return (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-divider px-4 py-3 md:grid-cols-[110px_minmax(0,1fr)_120px_150px_auto] md:px-5.5">
              <span className="text-small text-ink-muted tabular-nums max-md:col-span-2">{formatDate(row.paidAt ?? row.createdAt, "d MMM yyyy", locale)}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-body font-semibold text-ink">{row.planName}</span>
                <span className="text-caption text-ink-muted">
                  <span lang="en">{row.displayId}</span> · {t(gatewayLabel(row.gateway))}
                  {row.refund && ` · ${t("Refunded {amount}", { amount: formatCurrency(row.refund.amount, "BDT", locale) })}`}
                </span>
              </span>
              <span className="text-right text-body font-semibold text-ink tabular-nums md:text-left">{formatCurrency(row.amount, "BDT", locale)}</span>
              <span className="max-md:col-start-1">
                <Chip tone={status.tone} size="sm">
                  {t(status.label)}
                </Chip>
              </span>
              <span className="flex justify-end">
                {row.invoice ? (
                  <a href={`/api/invoices/${encodeURIComponent(row.invoice.id)}`} download className="inline-flex h-8 items-center gap-1.5 rounded-full border border-input px-3 text-small font-semibold text-ink hover:bg-surface-sunken pointer-coarse:h-11" aria-label={t("Download invoice {number}", { number: row.invoice.invoiceNumber })}>
                    <FileDown className="size-3.5" aria-hidden="true" />
                    {t("Invoice")}
                  </a>
                ) : (
                  <span className="text-caption text-ink-faint">—</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length < total && (
        <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-3 text-small text-ink-muted md:px-5.5">
          <span>{t("Showing {shown} of {total}", { shown: formatCount(rows.length, locale), total: formatCount(total, locale) })}</span>
          <Button variant="secondary" size="xs" onClick={more} disabled={isPending} className="pointer-coarse:h-11">
            {isPending && <Loader size={12} />}
            {t("Show more")}
          </Button>
        </div>
      )}
    </Card>
  );
}
