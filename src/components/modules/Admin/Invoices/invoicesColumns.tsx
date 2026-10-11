import type { ColumnDef } from "@tanstack/react-table";
import DateCell from "@/components/shared/cell/DateCell";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { IInvoiceListItem } from "@/types/invoice.types";

export const invoicesColumns: ColumnDef<IInvoiceListItem>[] = [
  {
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.invoiceNumber}</span>,
  },
  {
    id: "issuedTo",
    accessorKey: "issuedTo",
    header: "Issued To",
  },
  {
    id: "totalAmount",
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.totalAmount)}</span>,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <DateCell date={row.original.createdAt} />,
    meta: { exportValue: (row) => formatDate(row.createdAt) },
  },
];
