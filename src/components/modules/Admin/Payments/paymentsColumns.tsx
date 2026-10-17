import type { ColumnDef } from "@tanstack/react-table";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatAmount } from "@/lib/currency";
import Localized from "@/components/shared/Localized";
import RelativeTime from "@/components/shared/RelativeTime";
import T from "@/components/shared/T";
import { formatDate } from "@/lib/date";
import { GATEWAY_CHIP_CLASS, PAYMENT_STATUS_LABEL, paymentNote, shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IPayment } from "@/types/payment.types";

const NOTE_TONE = { muted: "text-ink-muted", danger: "text-expense", warning: "text-warning" } as const;

// The design's Payments list: the short id, the person over what matters
// about the payment, plan, how they paid, the amount, status, and when.
export const paymentsColumns: ColumnDef<IPayment>[] = [
  {
    id: "id",
    accessorFn: (row) => shortPaymentId(row.id),
    header: "Payment",
    enableSorting: false,
    cell: ({ getValue }) => <span className="font-mono text-small font-semibold">{String(getValue())}</span>,
    meta: { width: 96 },
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "Person",
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate font-semibold text-ink">{row.original.platformUser?.name ?? <T>Unknown person</T>}</span>
        <Localized>
          {(t) => {
            const note = paymentNote(row.original, t);
            return <span className={cn("truncate text-caption", NOTE_TONE[note.tone])}>{note.text}</span>;
          }}
        </Localized>
      </span>
    ),
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>` },
  },
  {
    id: "plan",
    accessorFn: (row) => row.plan.name,
    header: "Plan",
    cell: ({ row }) => <span className="text-ink-2">{row.original.plan.name}</span>,
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
        {formatAmount(row.original.amount, row.original.currency)}
      </span>
    ),
    meta: { width: 110, align: "right" },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadgeCell status={row.original.status} label={PAYMENT_STATUS_LABEL[row.original.status]} dot />,
    meta: { width: 150, exportValue: (row) => PAYMENT_STATUS_LABEL[row.status] },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => <span className="whitespace-nowrap text-small text-ink-2">
        <RelativeTime value={row.original.createdAt} />
      </span>,
    meta: { width: 122, exportValue: (row) => formatDate(row.createdAt, "yyyy-MM-dd HH:mm") },
  },
];
