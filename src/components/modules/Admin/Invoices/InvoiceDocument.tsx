import PrintButton from "@/components/shared/PrintButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date";
import type { IInvoiceDetail } from "@/types/invoice.types";
import InvoiceLineItems from "./InvoiceLineItems";

// Laid out as a printable document; the dashboard chrome is print:hidden.
const InvoiceDocument = ({ invoice }: { invoice: IInvoiceDetail }) => {
  return (
    <Card className="shadow-sm shadow-black/5 print:shadow-none print:ring-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Invoice</p>
          <h1 className="font-mono text-xl font-semibold text-foreground">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">Issued to {invoice.issuedTo}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(invoice.createdAt)}</p>
          {invoice.payment?.plan && <p className="text-xs text-muted-foreground">Plan: {invoice.payment.plan.name}</p>}
        </div>
        <PrintButton />
      </CardHeader>
      <CardContent>
        <InvoiceLineItems items={invoice.lineItems} total={invoice.totalAmount} currency={invoice.payment?.currency} />
      </CardContent>
    </Card>
  );
};

export default InvoiceDocument;
