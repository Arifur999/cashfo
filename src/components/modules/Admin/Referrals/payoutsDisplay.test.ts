import { describe, expect, it } from "vitest";
import type { IPayoutCheck, IPayoutDetail, IPayoutMethodSnapshot } from "@/types/referral.types";
import { canCancelReferral, firstName, owedLines, payoutAccountLine, payoutDestination, referralExample, rowActions, rowChecks, statusNote } from "./payoutsDisplay";

const bkash: IPayoutMethodSnapshot = { type: "BKASH", accountName: "Nasrin Akter", walletNumber: "01819552310", bankName: null, branch: null, bankAccountType: null, accountNumber: null, routingNumber: null };
const bank: IPayoutMethodSnapshot = { type: "BANK", accountName: "Mitu Das", walletNumber: null, bankName: "BRAC Bank", branch: "Gulshan", bankAccountType: "SAVINGS", accountNumber: "1503204142201", routingNumber: "060261726" };
const ok = (key: IPayoutCheck["key"]): IPayoutCheck => ({ key, ok: true, detail: null });
const bad = (key: IPayoutCheck["key"]): IPayoutCheck => ({ key, ok: false, detail: null });

describe("payoutDestination", () => {
  it("writes a wallet's whole number and a bank account's last four", () => {
    expect(payoutDestination(bkash)).toBe("bKash 01819-552310");
    expect(payoutDestination(bank)).toBe("BRAC Bank •••• 2201");
    expect(payoutDestination({ ...bank, bankName: "Dutch-Bangla Bank" })).toBe("DBBL •••• 2201");
  });

  it("names the account and a bank's branch under it", () => {
    expect(payoutAccountLine(bkash)).toBe("Nasrin Akter");
    expect(payoutAccountLine(bank)).toBe("Mitu Das · Gulshan");
  });
});

describe("rowChecks", () => {
  const checks = [ok("NAME_MATCHES"), ok("CODE_CONFIRMED"), ok("NO_REFUNDS"), bad("FRIEND_PAID_FROM_THIS_NUMBER")];

  it("puts what went wrong first, two lines at most", () => {
    const lines = rowChecks({ checks, status: "REQUESTED", trxId: null, method: bkash });
    expect(lines.map((line) => line.text)).toEqual(["Friend paid from this number", "Name matches"]);
  });

  it("shows a paid request's transaction ID instead", () => {
    expect(rowChecks({ checks, status: "PAID", trxId: "8J3LW1P0QS", method: bkash })).toEqual([{ ok: true, text: "TrxID {id}", values: { id: "8J3LW1P0QS" } }]);
  });

  it("shows only the warnings on a rejected request", () => {
    expect(rowChecks({ checks: [ok("NAME_MATCHES"), bad("WRONG_NUMBER_FOR_METHOD")], status: "REJECTED", trxId: null, method: bkash })).toEqual([
      { ok: false, text: "Not a {method} number", values: { method: "bKash" } },
    ]);
  });
});

describe("rowActions and statusNote", () => {
  it("offers Approve, or Review when a check failed, then Mark paid", () => {
    expect(rowActions({ status: "REQUESTED", checks: [ok("NAME_MATCHES")] }, true)).toEqual(["approve", "reject"]);
    expect(rowActions({ status: "REQUESTED", checks: [bad("NAME_MATCHES")] }, true)).toEqual(["review", "reject"]);
    expect(rowActions({ status: "APPROVED", checks: [] }, true)).toEqual(["pay"]);
    expect(rowActions({ status: "PAID", checks: [] }, true)).toEqual(["view"]);
  });

  it("gives those who can only look View on every row", () => {
    expect(rowActions({ status: "REQUESTED", checks: [] }, false)).toEqual(["view"]);
    expect(rowActions({ status: "APPROVED", checks: [] }, false)).toEqual(["view"]);
  });

  it("says a waiting request with a warning needs a look", () => {
    expect(statusNote({ status: "REQUESTED", checks: [bad("NAME_MATCHES")] })).toEqual({ text: "Needs a look", withDay: false });
    expect(statusNote({ status: "REJECTED", checks: [] }).text).toBe("Money returned");
  });
});

describe("owedLines", () => {
  const part = (amount: string, planName: string, extra: Partial<IPayoutDetail["owedBecause"][number]> = {}) => ({
    referralId: Math.random().toString(36),
    friend: { id: "f", name: "Friend" },
    kind: "COMMISSION" as const,
    planName,
    paidAmount: "2700.00",
    commissionAmount: amount,
    amount,
    availableAt: "2026-09-20T00:00:00.000Z",
    pastWindow: true,
    refunded: false,
    ...extra,
  });
  const format = { money: (n: number) => `৳ ${n}`, moment: () => "30 Sep, 4:05 pm", count: (n: number) => String(n) };
  const detail = {
    owedBecause: [part("540.00", "Yearly Pro"), part("540.00", "Yearly Pro"), part("540.00", "Yearly Pro"), part("540.00", "Yearly Pro")],
    checks: [ok("NAME_MATCHES"), ok("CODE_CONFIRMED"), ok("NO_REFUNDS")],
    method: { ...bkash, type: "NAGAD" as const },
    amount: "2160.00",
    codeConfirmedAt: "2026-09-30T10:05:00.000Z",
  };

  it("reads as the board's four lines", () => {
    const lines = owedLines(detail, 7, format);
    expect(lines.map((line) => [line.text, line.value])).toEqual([
      ["{count} friends bought {plan}", "4 × ৳ 540"],
      ["All past the {days}-day window, none refunded", "৳ 2160"],
      ["Name on {method} matches the account", "Nasrin Akter"],
      ["Confirmed with a one-time code", "30 Sep, 4:05 pm"],
    ]);
    expect(lines.every((line) => line.ok)).toBe(true);
  });

  it("warns about a commission still inside the window or refunded", () => {
    const lines = owedLines({ ...detail, owedBecause: [part("540.00", "Yearly Pro", { pastWindow: false }), part("144.00", "Business", { refunded: true })] }, 7, format);
    expect(lines.filter((line) => !line.ok).map((line) => line.text)).toEqual(["{count} still inside the refund window", "{count} friend was refunded"]);
  });
});

describe("referralExample", () => {
  it("works the board's numbers out as the API does", () => {
    expect(referralExample(2999, 10, 20)).toEqual({ price: 2999, friendPays: 2700, commission: 540, youKeep: 2160 });
    expect(referralExample(299, 10, 20)).toEqual({ price: 299, friendPays: 270, commission: 54, youKeep: 216 });
    expect(referralExample(799, 10, 20)).toEqual({ price: 799, friendPays: 720, commission: 144, youKeep: 576 });
  });

  it("takes nothing off with no discount", () => {
    expect(referralExample(299, 0, 0)).toEqual({ price: 299, friendPays: 299, commission: 0, youKeep: 299 });
  });
});

describe("small helpers", () => {
  it("cancels only a commission that is waiting or ready, untouched", () => {
    expect(canCancelReferral({ status: "PENDING", paidOutAmount: null })).toBe(true);
    expect(canCancelReferral({ status: "AVAILABLE", paidOutAmount: "100.00" })).toBe(false);
    expect(canCancelReferral({ status: "PAID_OUT", paidOutAmount: null })).toBe(false);
  });

  it("takes a first name", () => {
    expect(firstName("Nasrin Akter")).toBe("Nasrin");
  });
});
