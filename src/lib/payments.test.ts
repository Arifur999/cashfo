import { describe, expect, it } from "vitest";
import type { IPaymentDetail } from "@/types/payment.types";
import { paymentLine, paymentNote, paymentSteps, shortPaymentId } from "./payments";

const NBSP = " ";

const base = {
  status: "SUCCESS" as const,
  failureReason: null,
  gateway: "BKASH" as const,
  couponCode: null,
  discountApplied: null,
  duplicateOfId: null,
  invoice: { id: "i1", invoiceNumber: "INV-2026-000403" },
};

const detail: IPaymentDetail = {
  id: "3f2a1c9b-0000-4000-8000-000000000000",
  platformUserId: "u1",
  planId: "p1",
  plan: { id: "p1", name: "Monthly Pro", slug: "monthly-pro" },
  platformUser: { id: "u1", name: "Mahbub Alam", email: "mahbub@example.com" },
  amount: "299.00",
  currency: "BDT",
  discountApplied: null,
  couponId: null,
  couponCode: null,
  duplicateOfId: null,
  gateway: "BKASH",
  gatewayReferenceId: "BKA8X2Q71D",
  status: "SUCCESS",
  failureReason: null,
  paidAt: "2026-10-01T04:14:31.000Z",
  createdAt: "2026-10-01T04:14:02.000Z",
  invoice: { id: "i1", paymentId: "x", invoiceNumber: "INV-2026-000403", issuedTo: "Mahbub Alam", lineItems: [], totalAmount: "299.00", pdfUrl: null, createdAt: "2026-10-01T04:14:32.000Z" },
  refund: null,
  otherPayments: [],
};

describe("shortPaymentId", () => {
  it("shows the first part of the id in capitals", () => {
    expect(shortPaymentId("3f2a1c9b-0000-4000-8000-000000000000")).toBe("PAY-3F2A1C9B");
  });
});

describe("paymentNote", () => {
  it("says what matters most about the payment", () => {
    expect(paymentNote({ ...base, duplicateOfId: "other" })).toEqual({ text: "Looks like a double charge", tone: "warning" });
    expect(paymentNote({ ...base, status: "FAILED", failureReason: "Not enough balance" })).toEqual({ text: "Not enough balance", tone: "danger" });
    expect(paymentNote({ ...base, status: "PENDING" })).toEqual({ text: "Waiting for bKash to confirm", tone: "muted" });
    expect(paymentNote({ ...base, status: "REFUNDED" })).toEqual({ text: "Refunded", tone: "muted" });
    expect(paymentNote({ ...base, couponCode: "PRO100", discountApplied: "100.00" })).toEqual({ text: `PRO100 · ৳${NBSP}100 off`, tone: "muted" });
    expect(paymentNote({ ...base, gateway: "MANUAL" })).toEqual({ text: "Entered by hand", tone: "muted" });
    expect(paymentNote(base)).toEqual({ text: "Invoice INV-2026-000403", tone: "muted" });
  });
});

describe("paymentSteps", () => {
  it("tells the story of a paid payment", () => {
    expect(paymentSteps(detail).map((step) => step.what)).toEqual([
      "Payment started from the app",
      "Sent to bKash",
      "bKash confirmed the payment",
      "Invoice INV-2026-000403 made",
    ]);
  });

  it("ends a failed one with the refusal and a refunded one with the refund", () => {
    expect(paymentSteps({ ...detail, status: "FAILED", failureReason: "Not enough balance", invoice: null }).at(-1)).toMatchObject({
      what: "bKash refused it: Not enough balance",
      tone: "danger",
    });
    const refund = { id: "r", paymentId: "x", amount: "299.00", reason: "Double charge", processedBy: "a", status: "COMPLETED" as const, createdAt: "2026-10-02T04:00:00.000Z" };
    expect(paymentSteps({ ...detail, status: "REFUNDED", refund }).at(-1)).toMatchObject({ what: `Refunded ৳${NBSP}299.00`, tone: "neutral" });
  });
});

describe("paymentLine", () => {
  it("sums the payment up in one line", () => {
    expect(paymentLine(detail)).toBe("Monthly Pro · paid with bKash · 1 Oct 2026, 10:14 am · Mahbub Alam");
  });
});
