import type { IRefundSummary, PaymentGateway, PaymentStatus } from "./payment.types";
import type { IFeatureLimits } from "./plan.types";

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
  // The billing phone it was issued with (Settings › Plans & billing ›
  // Billing details); absent from an older API.
  issuedPhone?: string | null;
  lineItems: IInvoiceLineItem[];
  totalAmount: string;
  pdfUrl: string | null;
  // When it was last emailed to the customer (Mark paid sends it).
  emailedAt?: string | null;
  createdAt: string;
}

export interface IInvoiceListItem extends IInvoice {
  payment: { id: string; platformUserId: string; planId: string };
}

// The API sends every column of the payment with the invoice, its status
// among them, and what went back on it (null when nothing did; absent from
// an API older than the field), so the sheet can stamp PAID, REFUNDED or
// PARTLY REFUNDED without reading the payment again.
export interface IInvoiceDetail extends IInvoice {
  payment: {
    id: string;
    currency?: string;
    gateway?: PaymentGateway;
    status: PaymentStatus;
    refund?: IRefundSummary | null;
    // What the plan allows (absent from an older API).
    plan: { id: string; name: string; featureLimits?: Partial<IFeatureLimits> };
    // The period it paid for, and the number the money came from.
    periodStart?: string | null;
    periodEnd?: string | null;
    payerAccount?: string | null;
  };
}
