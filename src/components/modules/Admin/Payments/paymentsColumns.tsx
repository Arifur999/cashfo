import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { PaymentsView } from "@/queries/payment.queries";
import type { IPayment } from "@/types/payment.types";
import GatewayCell from "./GatewayCell";

const leadingColumns: ColumnDef<IPayment>[] = [
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
  {
    id: "user",
    accessorFn: (row) => row.platformUser?.name ?? "Unknown",
    header: "User",
    cell: ({ row }) => <UserInfoCell name={row.original.platformUser?.name} email={row.original.platformUser?.email} />,
    meta: { exportValue: (row) => `${row.platformUser?.name ?? "Unknown"} <${row.platformUser?.email ?? ""}>` },
  },
  {
    id: "plan",
    accessorFn: (row) => row.plan.name,
    header: "Plan",
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-medium tabular-nums">{formatCurrency(row.original.amount, row.original.currency)}</span>,
  },
  {
    id: "gateway",
    accessorKey: "gateway",
    header: "Gateway",
    cell: ({ row }) => <GatewayCell gateway={row.original.gateway} />,
  },
];

const statusColumn: ColumnDef<IPayment> = {
  id: "status",
  accessorKey: "status",
  header: "Status",
  cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
};

const failureReasonColumn: ColumnDef<IPayment> = {
  id: "failureReason",
  accessorKey: "failureReason",
  header: "Failure Reason",
  cell: ({ row }) => <span className="text-destructive">{row.original.failureReason ?? "—"}</span>,
};

const invoiceColumn: ColumnDef<IPayment> = {
  id: "invoice",
  accessorFn: (row) => row.invoice?.invoiceNumber ?? "",
  header: "Invoice #",
  cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.invoice?.invoiceNumber ?? "—"}</span>,
};

// The failed view swaps the status column for the failure reason.
export const paymentsColumns: Record<PaymentsView, ColumnDef<IPayment>[]> = {
  all: [...leadingColumns, statusColumn, invoiceColumn],
  failed: [...leadingColumns, failureReasonColumn, invoiceColumn],
};
