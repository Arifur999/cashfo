import { describe, expect, it } from "vitest";
import type { IPayoutCheck, IPayoutLine, IPayoutMethodSnapshot } from "@/types/referral.types";
import { canCancelCommission, canReleaseCommission, deskChecks, firstName, payoutAccountLine, payoutDestination, referralExample, rowActions, rowChecks, statusNote } from "./payoutsDisplay";

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
  it("offers Review (approve line by line) on every waiting request, then Mark paid", () => {
    expect(rowActions({ status: "REQUESTED", checks: [ok("NAME_MATCHES")] }, true)).toEqual(["review", "reject"]);
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

describe("deskChecks", () => {
  const line = (reached: IPayoutLine["reached"]): IPayoutLine => ({
    id: reached,
    status: "IN_WITHDRAWAL",
    kind: "FIRST",
    friend: { id: "f", name: "Nusrat Jahan", email: "n@example.com", phone: null },
    payment: null,
    reached,
    paidAmount: "1719.00",
    rate: 20,
    amount: "343.80",
    availableAt: "2026-10-05T06:00:00.000Z",
    paidFromMemberNumber: false,
  });
  const detail = {
    checks: [ok("NAME_MATCHES"), ok("CODE_CONFIRMED"), ok("HOLDS_OVER"), ok("NO_REFUNDS")],
    method: bkash,
    codeConfirmedAt: "2026-09-30T10:05:00.000Z",
    lines: [line("RECEIVED"), line("RECEIVED")],
  };

  it("says what passed, with the name and when the code was confirmed", () => {
    const lines = deskChecks(detail, () => "30 Sep, 4:05 pm");
    expect(lines.map((l) => l.text)).toEqual(["Account name matches the profile", "Confirmed with a one-time code", "All refund holds are over", "No refunds on these payments"]);
    expect(lines[0].value).toBe("Nasrin Akter");
    expect(lines[1].value).toBe("30 Sep, 4:05 pm");
  });

  it("puts the warnings first and counts the refunds", () => {
    const lines = deskChecks({ ...detail, checks: [ok("NAME_MATCHES"), bad("NO_REFUNDS"), bad("HOLDS_OVER")], lines: [line("REFUNDED"), line("RECEIVED")] }, () => "");
    expect(lines.map((l) => [l.ok, l.text])).toEqual([
      [false, "{count} payment was refunded"],
      [false, "Some payments are still inside the refund hold"],
      [true, "Account name matches the profile"],
    ]);
  });
});

describe("referralExample", () => {
  it("works the board's numbers out as the API does, the commission to the paisa", () => {
    expect(referralExample(1910, 10, 20)).toEqual({ price: 1910, friendPays: 1719, commission: 343.8, youKeep: 1375.2 });
    expect(referralExample(2999, 10, 20)).toEqual({ price: 2999, friendPays: 2700, commission: 540, youKeep: 2160 });
    expect(referralExample(299, 10, 20)).toEqual({ price: 299, friendPays: 270, commission: 54, youKeep: 216 });
    expect(referralExample(799, 10, 20)).toEqual({ price: 799, friendPays: 720, commission: 144, youKeep: 576 });
  });

  it("takes nothing off with no discount", () => {
    expect(referralExample(299, 0, 0)).toEqual({ price: 299, friendPays: 299, commission: 0, youKeep: 299 });
  });
});

describe("small helpers", () => {
  it("cancels a commission not in a request being paid, and releases one held for a check", () => {
    expect(canCancelCommission("ON_HOLD")).toBe(true);
    expect(canCancelCommission("UNDER_CHECK")).toBe(true);
    expect(canCancelCommission("IN_WITHDRAWAL")).toBe(false);
    expect(canCancelCommission("PAID_OUT")).toBe(false);
    expect(canReleaseCommission("UNDER_CHECK")).toBe(true);
    expect(canReleaseCommission("AVAILABLE")).toBe(false);
  });

  it("takes a first name", () => {
    expect(firstName("Nasrin Akter")).toBe("Nasrin");
  });
});
