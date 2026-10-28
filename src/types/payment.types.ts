import type { IInvoice, IInvoiceSummary } from "./invoice.types";

export const PAYMENT_GATEWAYS = ["BKASH", "NAGAD", "SSLCOMMERZ", "CARD", "MANUAL"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type RefundStatus = "PENDING" | "COMPLETED" | "REJECTED";

// What a payment bought: a first plan, the next period of the same plan, or
// a move up.
export type PaymentPurpose = "NEW" | "RENEWAL" | "UPGRADE";

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

// What a list row or an invoice brings of a payment's refund: enough to tell
// a partial one from a full one.
export type IRefundSummary = Pick<IRefund, "amount" | "status" | "createdAt">;

export interface IPayment {
  id: string;
  platformUserId: string;
  planId: string;
  // billingCycle and price come with a single payment (its page).
  plan: { id: string; name: string; slug: string; billingCycle?: string; price?: string | number };
  platformUser: { id: string; name: string; email: string } | null;
  // The customer who paid (null on an old sandbox payment, which has
  // platformUserId instead).
  userId?: string | null;
  purpose?: PaymentPurpose;
  amount: string;
  currency: string;
  discountApplied: string | null;
  // The plan's price at checkout, and the referred friend's discount when it
  // beat the coupon.
  listPrice?: string | null;
  referralDiscount?: string | null;
  // The number the money came from, typed in at Mark paid.
  payerAccount?: string | null;
  // An unpaid checkout lapses at this time.
  expiresAt?: string | null;
  // The period it paid for (set when it is marked paid).
  periodStart?: string | null;
  periodEnd?: string | null;
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
  // What went back, null when nothing did. Absent from an API older than
  // the field.
  refund?: IRefundSummary | null;
}

export interface IOtherPayment {
  id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

// The payer's billing tickets from around the payment ("charged twice?").
export interface IRelatedTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
}

// The customer's plan now.
export interface IPayerSubscription {
  planId: string;
  planName: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface IPaymentDetail extends Omit<IPayment, "invoice" | "refund"> {
  invoice: IInvoice | null;
  refund: IRefund | null;
  // The same person's other payments, newest first.
  otherPayments: IOtherPayment[];
  relatedTickets?: IRelatedTicket[];
  subscription?: IPayerSubscription | null;
}

// Mark paid: the gateway's transaction ID, when the money arrived (now when
// left out), the number it came from and a note for the audit log.
export interface IMarkPaymentPaidPayload {
  gatewayReferenceId: string;
  paidAt?: string;
  payerAccount?: string;
  note?: string;
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
