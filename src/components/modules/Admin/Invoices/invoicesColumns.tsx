import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { IInvoiceListItem } from "@/types/invoice.types";

// Every invoice, newest first: its number, who it went to, how much, when.
export const invoicesColumns: ColumnDef<IInvoiceListItem>[] = [
  {
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }) => <code className="font-mono text-small font-semibold text-ink">{row.original.invoiceNumber}</code>,
  },
  {
    id: "issuedTo",
    accessorKey: "issuedTo",
    header: "Issued to",
    cell: ({ row }) => <span className="font-semibold text-ink">{row.original.issuedTo}</span>,
  },
  {
    id: "totalAmount",
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatCurrency(row.original.totalAmount)}</span>,
    meta: { align: "right" },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} formatString="d MMM yyyy" />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
];
