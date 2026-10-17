import type { IPayment, IPaymentDetail, PaymentGateway, PaymentStatus } from "@/types/payment.types";
import { formatCurrency } from "./currency";
import { formatDate } from "./date";
import { humanizeEnum } from "./statusBadge";

// How a payment's status reads: what happened to the money.
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  SUCCESS: "Paid",
  FAILED: "Failed",
  PENDING: "Waiting",
  REFUNDED: "Refunded",
};

// The gateway's tag in a list, in its own colour.
export const GATEWAY_CHIP_CLASS: Record<PaymentGateway, string> = {
  BKASH: "bg-gateway-bkash text-white",
  NAGAD: "bg-gateway-nagad text-white",
  SSLCOMMERZ: "bg-info text-white",
  CARD: "bg-ink-2 text-white",
  MANUAL: "bg-line text-ink-2",
};

// The gateway's slice of the "how people paid" bar.
export const GATEWAY_BAR_CLASS: Record<PaymentGateway, string> = {
  BKASH: "bg-gateway-bkash",
  NAGAD: "bg-gateway-nagad",
  SSLCOMMERZ: "bg-info",
  CARD: "bg-ink-2",
  MANUAL: "bg-ink-faint",
};

// "PAY-3F2A1C9B": the first part of the id, which the list search also
// understands.
export const shortPaymentId = (id: string) => `PAY-${id.slice(0, 8).toUpperCase()}`;

type NoteTone = "muted" | "danger" | "warning";

// The quiet line under the person in the list: what went wrong, what is
// still pending, which coupon took money off, or how the money came in.
export const paymentNote = (
  payment: Pick<IPayment, "status" | "failureReason" | "gateway" | "couponCode" | "discountApplied" | "duplicateOfId" | "invoice">,
): { text: string; tone: NoteTone } => {
  if (payment.duplicateOfId) return { text: "Looks like a double charge", tone: "warning" };
  if (payment.status === "FAILED") return { text: payment.failureReason ?? "The payment did not go through", tone: "danger" };
  if (payment.status === "PENDING") return { text: `Waiting for ${humanizeEnum(payment.gateway)} to confirm`, tone: "muted" };
  if (payment.status === "REFUNDED") return { text: "Refunded", tone: "muted" };
  if (payment.discountApplied && Number(payment.discountApplied) > 0) {
    const off = `${formatCurrency(payment.discountApplied, undefined, 0)} off`;
    return { text: payment.couponCode ? `${payment.couponCode} · ${off}` : off, tone: "muted" };
  }
  if (payment.gateway === "MANUAL") return { text: "Entered by hand", tone: "muted" };
  return { text: payment.invoice ? `Invoice ${payment.invoice.invoiceNumber}` : "Paid in full", tone: "muted" };
};

export interface PaymentStep {
  what: string;
  at: string;
  tone: "neutral" | "success" | "danger" | "warning";
}

// "What happened", in order: started, handed to the gateway, confirmed or
// refused or still waiting, invoiced, refunded.
export const paymentSteps = (payment: IPaymentDetail): PaymentStep[] => {
  const gateway = humanizeEnum(payment.gateway);
  const steps: PaymentStep[] = [
    { what: payment.gateway === "MANUAL" ? "Entered by hand" : "Payment started from the app", at: payment.createdAt, tone: "neutral" },
  ];
  if (payment.gateway !== "MANUAL") steps.push({ what: `Sent to ${gateway}`, at: payment.createdAt, tone: "neutral" });
  if (payment.status === "FAILED") {
    steps.push({ what: payment.failureReason ? `${gateway} refused it: ${payment.failureReason}` : `${gateway} refused it`, at: payment.paidAt ?? payment.createdAt, tone: "danger" });
  } else if (payment.status === "PENDING") {
    steps.push({ what: `Waiting for ${gateway} to confirm`, at: payment.createdAt, tone: "warning" });
  } else {
    steps.push({ what: payment.gateway === "MANUAL" ? "Marked as paid" : `${gateway} confirmed the payment`, at: payment.paidAt ?? payment.createdAt, tone: "success" });
  }
  if (payment.invoice) steps.push({ what: `Invoice ${payment.invoice.invoiceNumber} made`, at: payment.invoice.createdAt, tone: "success" });
  if (payment.refund) {
    steps.push({ what: `Refunded ${formatCurrency(payment.refund.amount, payment.currency)}`, at: payment.refund.createdAt, tone: "neutral" });
  }
  return steps;
};

// "Monthly Pro · paid with bKash · 1 Oct 2026, 10:14 am · Mahbub Alam"
export const paymentLine = (payment: IPaymentDetail) =>
  [
    payment.plan.name,
    `${payment.status === "SUCCESS" || payment.status === "REFUNDED" ? "paid with" : "via"} ${humanizeEnum(payment.gateway)}`,
    formatDate(payment.paidAt ?? payment.createdAt, "d MMM yyyy, h:mm aaa"),
    payment.platformUser?.name ?? "Unknown person",
  ].join(" · ");
