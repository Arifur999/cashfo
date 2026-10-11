import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import type { IInvoiceLineItem } from "@/types/invoice.types";

interface InvoiceLineItemsProps {
  items: IInvoiceLineItem[];
  total: string;
  currency?: string;
}

// Shared by the invoice detail page and the payment detail page.
const InvoiceLineItems = ({ items, total, currency }: InvoiceLineItemsProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-xs text-muted-foreground uppercase">Description</TableHead>
          <TableHead className="text-right text-xs text-muted-foreground uppercase">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={`${item.description}-${index}`} className="hover:bg-transparent">
            <TableCell>{item.description}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(item.amount, currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell className="font-semibold">Total</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(total, currency)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};

export default InvoiceLineItems;
