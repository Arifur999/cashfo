import type { IPayment, IPaymentDetail, PaymentGateway, PaymentStatus } from "@/types/payment.types";
import { formatCurrency } from "./currency";
import { formatDate } from "./date";
import { inEnglish, type Translate } from "./i18n/message";
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
  t: Translate = inEnglish,
): { text: string; tone: NoteTone } => {
  if (payment.duplicateOfId) return { text: t("Looks like a double charge"), tone: "warning" };
  if (payment.status === "FAILED") return { text: payment.failureReason ?? t("The payment did not go through"), tone: "danger" };
  if (payment.status === "PENDING") return { text: t("Waiting for {gateway} to confirm", { gateway: t(humanizeEnum(payment.gateway)) }), tone: "muted" };
  if (payment.status === "REFUNDED") return { text: t("Refunded"), tone: "muted" };
  if (payment.discountApplied && Number(payment.discountApplied) > 0) {
    const off = t("{amount} off", { amount: formatCurrency(payment.discountApplied, undefined, 0) });
    return { text: payment.couponCode ? `${payment.couponCode} · ${off}` : off, tone: "muted" };
  }
  if (payment.gateway === "MANUAL") return { text: t("Entered by hand"), tone: "muted" };
  return { text: payment.invoice ? t("Invoice {number}", { number: payment.invoice.invoiceNumber }) : t("Paid in full"), tone: "muted" };
};

export interface PaymentStep {
  what: string;
  at: string;
  tone: "neutral" | "success" | "danger" | "warning";
}

// "What happened", in order: started, handed to the gateway, confirmed or
// refused or still waiting, invoiced, refunded.
export const paymentSteps = (payment: IPaymentDetail, t: Translate = inEnglish): PaymentStep[] => {
  const gateway = t(humanizeEnum(payment.gateway));
  const steps: PaymentStep[] = [
    { what: t(payment.gateway === "MANUAL" ? "Entered by hand" : "Payment started from the app"), at: payment.createdAt, tone: "neutral" },
  ];
  if (payment.gateway !== "MANUAL") steps.push({ what: t("Sent to {gateway}", { gateway }), at: payment.createdAt, tone: "neutral" });
  if (payment.status === "FAILED") {
    steps.push({
      what: payment.failureReason ? t("{gateway} refused it: {reason}", { gateway, reason: payment.failureReason }) : t("{gateway} refused it", { gateway }),
      at: payment.paidAt ?? payment.createdAt,
      tone: "danger",
    });
  } else if (payment.status === "PENDING") {
    steps.push({ what: t("Waiting for {gateway} to confirm", { gateway }), at: payment.createdAt, tone: "warning" });
  } else {
    steps.push({ what: payment.gateway === "MANUAL" ? t("Marked as paid") : t("{gateway} confirmed the payment", { gateway }), at: payment.paidAt ?? payment.createdAt, tone: "success" });
  }
  if (payment.invoice) steps.push({ what: t("Invoice {number} made", { number: payment.invoice.invoiceNumber }), at: payment.invoice.createdAt, tone: "success" });
  if (payment.refund) {
    steps.push({ what: t("Refunded {amount}", { amount: formatCurrency(payment.refund.amount, payment.currency) }), at: payment.refund.createdAt, tone: "neutral" });
  }
  return steps;
};

// "Monthly Pro · paid with bKash · 1 Oct 2026, 10:14 am · Mahbub Alam"
export const paymentLine = (payment: IPaymentDetail, t: Translate = inEnglish) =>
  [
    payment.plan.name,
    t(payment.status === "SUCCESS" || payment.status === "REFUNDED" ? "paid with {gateway}" : "via {gateway}", { gateway: t(humanizeEnum(payment.gateway)) }),
    formatDate(payment.paidAt ?? payment.createdAt, "d MMM yyyy, h:mm aaa"),
    payment.platformUser?.name ?? t("Unknown person"),
  ].join(" · ");
