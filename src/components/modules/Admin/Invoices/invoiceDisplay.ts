import { BACK_PARAM, pickParams } from "@/components/modules/Admin/Payments/paymentsDisplay";
import type { IInvoiceDetail } from "@/types/invoice.types";
import type { PaymentStatus } from "@/types/payment.types";
import { INVOICES_TABLE_CONFIG } from "./invoicesTable.config";

// Plain helpers for the invoice pages. Pure, so they are tested on their own.

export const INVOICES_LIST_HREF = "/admin/invoices";

const LIST_KEYS: readonly string[] = [...INVOICES_TABLE_CONFIG.queryKeys, "page", "limit"];

// An invoice's page reads the list it was opened from (its dates and page)
// from ?back=, as a payment's does. Only the list's own params are kept.
export const invoiceListQuery = (raw: string | null | undefined): string => pickParams(raw, LIST_KEYS);

// An invoice's page, carrying the list's query along.
export const invoiceHref = (id: string, fromList?: string | null): string => {
  const query = invoiceListQuery(fromList);
  return `${INVOICES_LIST_HREF}/${id}${query ? `?${new URLSearchParams({ [BACK_PARAM]: query }).toString()}` : ""}`;
};

// The way back from an invoice's page: the list, as it was left.
export const invoicesListHref = (back: string | string[] | null | undefined): string => {
  const query = invoiceListQuery(Array.isArray(back) ? back[0] : back);
  return query ? `${INVOICES_LIST_HREF}?${query}` : INVOICES_LIST_HREF;
};

// "Mahbub Alam <mahbub@example.com>", as an invoice stores who it went to,
// split into the name and the email for a line each. Anything else is the
// name as written.
export const splitIssuedTo = (issuedTo: string): { name: string; email: string | null } => {
  const text = issuedTo.trim();
  const match = /^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/.exec(text);
  if (!match) return { name: text, email: null };
  return match[1] ? { name: match[1], email: match[2] } : { name: match[2], email: null };
};

// The invoice's payment status. The API sends every column of the payment
// with the invoice, its status among them, though IInvoiceDetail doesn't
// name it yet.
export const invoicePaymentStatus = (invoice: IInvoiceDetail): PaymentStatus | undefined =>
  (invoice.payment as (IInvoiceDetail["payment"] & { status?: PaymentStatus }) | null | undefined)?.status;

// The stamp at the top of the sheet: PAID, or once the payment went back,
// REFUNDED, or PARTLY REFUNDED when less than the total did. A refund whose
// amount couldn't be read stamps REFUNDED.
export type InvoiceStamp = "paid" | "refunded" | "partly-refunded";

export const invoiceStamp = (total: string | number, refunded: boolean, refund?: { amount: string | number } | null): InvoiceStamp => {
  if (!refunded && !refund) return "paid";
  return refund && Number(refund.amount) < Number(total) ? "partly-refunded" : "refunded";
};
