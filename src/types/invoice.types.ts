export interface IInvoiceLineItem {
  description: string;
  amount: number;
}

export interface IInvoiceSummary {
  id: string;
  invoiceNumber: string;
}

// `totalAmount` is a Decimal, so it arrives as a fixed-2dp string.
export interface IInvoice {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  issuedTo: string;
  lineItems: IInvoiceLineItem[];
  totalAmount: string;
  pdfUrl: string | null;
  createdAt: string;
}

export interface IInvoiceListItem extends IInvoice {
  payment: { id: string; platformUserId: string; planId: string };
}

export interface IInvoiceDetail extends IInvoice {
  payment: { id: string; currency?: string; plan: { id: string; name: string } };
}
