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
  // The coupon's code, looked up for the list.
  couponCode: string | null;
  // An earlier successful payment by the same person for the same plan
  // within ten minutes: this one looks like a double charge.
  duplicateOfId: string | null;
  gateway: PaymentGateway;
  gatewayReferenceId: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: IInvoiceSummary | null;
}

export interface IOtherPayment {
  id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface IPaymentDetail extends Omit<IPayment, "invoice"> {
  invoice: IInvoice | null;
  refund: IRefund | null;
  // The same person's other payments, newest first.
  otherPayments: IOtherPayment[];
}

// The figures over the payments list (Dhaka months). Money is a fixed-2dp
// string.
export interface IPaymentStats {
  lastMonth: { month: string; collected: string; payments: number; changePct: number | null };
  thisMonth: { month: string; collected: string; payments: number; days: number };
  failedLast7Days: { count: number; amount: string };
  refundsLastMonth: { count: number; amount: string };
  gatewaysLastMonth: { gateway: PaymentGateway; count: number }[];
  statusCounts: Record<PaymentStatus, number>;
}

export interface IRefundPayload {
  amount: number;
  reason: string;
}
