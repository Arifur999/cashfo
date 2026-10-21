"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IInvoiceListItem } from "@/types/invoice.types";
import { splitIssuedTo } from "./invoiceDisplay";

// The day it was made, in the reader's language.
const IssuedOn = ({ date }: { date: string }) => {
  const { locale } = useLocale();
  return (
    <time dateTime={date} className="whitespace-nowrap text-ink-2">
      {formatDate(date, "d MMM yyyy", "—", locale)}
    </time>
  );
};

// Every invoice, newest first: its number, who it went to, how much, when.
// The whole row is the link to the invoice (the table's rowHref), named by
// its number. "Issued to" takes the room the fixed columns leave.
export const invoicesColumns: ColumnDef<IInvoiceListItem>[] = [
  {
    id: "invoiceNumber",
    accessorKey: "invoiceNumber",
    header: "Invoice",
    cell: ({ row }) => <span className="block truncate font-mono text-small font-semibold text-ink">{row.original.invoiceNumber}</span>,
    meta: { width: 180 },
  },
  {
    id: "issuedTo",
    accessorKey: "issuedTo",
    header: "Issued to",
    // "Name <email>", as an invoice stores it, as the name over the email,
    // like the person on a payment. The CSV keeps it as stored.
    cell: ({ row }) => {
      const { name, email } = splitIssuedTo(row.original.issuedTo);
      return (
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-semibold text-ink">{name}</span>
          {email && <span className="truncate text-caption text-ink-muted">{email}</span>}
        </span>
      );
    },
  },
  {
    id: "totalAmount",
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatAmount(row.original.totalAmount)}</span>,
    meta: { width: 120, align: "right" },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => <IssuedOn date={row.original.createdAt} />,
    // Kept apart from the right-aligned amount before it.
    meta: { width: 140, cellClassName: "pl-4!", headerClassName: "pl-4!", exportValue: (row) => formatDate(row.createdAt) },
  },
];
