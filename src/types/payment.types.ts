import type { IInvoice, IInvoiceSummary } from "./invoice.types";

export const PAYMENT_GATEWAYS = ["BKASH", "NAGAD", "SSLCOMMERZ", "CARD", "MANUAL"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type RefundStatus = "PENDING" | "COMPLETED" | "REJECTED";

// Decimal amounts arrive as fixed-2dp strings.
export interface IRefund {
  id: string;
  paymentId: string;
  amount: string;
  reason: string;
  processedBy: string;
  status: RefundStatus;
  createdAt: string;
}

export interface IPayment {
  id: string;
  platformUserId: string;
  planId: string;
  plan: { id: string; name: string; slug: string };
  platformUser: { id: string; name: string; email: string } | null;
  amount: string;
  currency: string;
  discountApplied: string | null;
  couponId: string | null;
  gateway: PaymentGateway;
  gatewayReferenceId: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: IInvoiceSummary | null;
}

export interface IPaymentDetail extends Omit<IPayment, "invoice"> {
  invoice: IInvoice | null;
  refund: IRefund | null;
}

export interface IRefundPayload {
  amount: number;
  reason: string;
}
