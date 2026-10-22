"use client";

import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatAmount } from "@/lib/currency";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import { formatDate } from "@/lib/date";
import { GATEWAY_CHIP_CLASS, PAYMENT_STATUS_LABEL, paymentNote, shortPaymentId } from "@/lib/payments";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IPayment } from "@/types/payment.types";
import { paymentBadge } from "./paymentsDisplay";

const NOTE_TONE = { muted: "text-ink-muted", danger: "text-expense", warning: "text-warning" } as const;

const PaymentNoteLine = ({ payment }: { payment: IPayment }) => {
  const { translate, locale } = useLocale();
  const note = paymentNote(payment, translate, locale);
  return <span className={cn("truncate text-caption", NOTE_TONE[note.tone])}>{note.text}</span>;
};

const Amount = ({ amount, currency }: { amount: string; currency: string }) => {
  const { locale } = useLocale();
  return formatAmount(amount, currency, locale);
};

// The design's Payments list: the short id, the person over what matters
// about the payment, plan, how they paid, the amount, status, and when. The
// whole row is the link to the payment (the table's rowHref), named by the
// id in the first cell. The row link takes the pointer over plain text, so
// no cell relies on a hover title: When prints the moment itself.
export const paymentsColumns: ColumnDef<IPayment>[] = [
  {
    id: "id",
    accessorFn: (row) => shortPaymentId(row.id),
    header: "Payment",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block truncate font-mono text-small font-semibold text-ink">
        {shortPaymentId(row.original.id)}
      </span>
    ),
    // The whole id in the CSV, to match against other records.
    meta: { width: 96, exportValue: (row) => row.id },
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "Person",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate font-semibold text-ink">{row.original.platformUser?.name ?? <T>Unknown person</T>}</span>
        <PaymentNoteLine payment={row.original} />
      </span>
    ),
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>` },
  },
  {
    id: "plan",
    accessorFn: (row) => row.plan.name,
    header: "Plan",
    cell: ({ row }) => (
      <span className="block truncate text-ink-2">{row.original.plan.name}</span>
    ),
    meta: { width: 110 },
  },
  {
    id: "gateway",
    accessorKey: "gateway",
    header: "Paid with",
    cell: ({ row }) => (
      <span className={cn("inline-flex rounded-sm px-2 py-0.5 text-caption font-bold", GATEWAY_CHIP_CLASS[row.original.gateway])}>
        <T>{humanizeEnum(row.original.gateway)}</T>
      </span>
    ),
    meta: { width: 112, exportValue: (row) => humanizeEnum(row.gateway) },
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className={cn("font-semibold tabular-nums", row.original.status === "REFUNDED" ? "text-ink-muted" : "text-ink")}>
        <Amount amount={row.original.amount} currency={row.original.currency} />
      </span>
    ),
    meta: { width: 110, align: "right" },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    // Amber for Waiting, and "Partly refunded" when less than was paid
    // went back. Room for that chip with its dot, and no more.
    cell: ({ row }) => {
      const badge = paymentBadge(row.original);
      return <StatusBadgeCell status={row.original.status} label={badge.label} tone={badge.tone} dot />;
    },
    meta: { width: 128, exportValue: (row) => PAYMENT_STATUS_LABEL[row.status] },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "When",
    // "Today, 2:10 pm", "27 Sep, 1:03 pm": the moment itself, no tooltip.
    cell: ({ row }) => (
      <span className="block truncate text-small text-ink-2">
        <RelativeTime value={row.original.createdAt} as="dateTime" />
      </span>
    ),
    meta: { width: 122, exportValue: (row) => formatDate(row.createdAt, "yyyy-MM-dd HH:mm") },
  },
];
