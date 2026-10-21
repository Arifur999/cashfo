"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DateCell from "@/components/shared/cell/DateCell";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { IInvoiceListItem } from "@/types/invoice.types";
import { invoiceHref } from "./invoiceDisplay";

// The number as a real link (a new tab with Ctrl or the middle button). It
// carries the list's query, so the invoice's page leads back to these rows;
// the click stops here instead of reaching the row's own.
const InvoiceNumberLink = ({ id, number }: { id: string; number: string }) => {
  const searchParams = useSearchParams();
  return (
    <Link href={invoiceHref(id, searchParams.toString())} onClick={(event) => event.stopPropagation()} className="font-mono text-small font-semibold text-ink hover:underline">
      {number}
    </Link>
  );
};

// Every invoice, newest first: its number, who it went to, how much, when.
export const invoicesColumns: ColumnDef<IInvoiceListItem>[] = [
  {
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }) => <InvoiceNumberLink id={row.original.id} number={row.original.invoiceNumber} />,
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
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatAmount(row.original.totalAmount)}</span>,
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
