import { describe, expect, it } from "vitest";
import { buildMarkPayoutPaidFormZodSchema, getFeeError, markPayoutPaidServerZodSchema, referralSettingsServerZodSchema } from "./referral.validation";

describe("mark a payout paid", () => {
  const schema = buildMarkPayoutPaidFormZodSchema(2160);
  const values = { trxId: "8K2M4N7QXA", paidAt: "2026-10-01T12:05", paidAmount: "2160", notifyUser: true, note: "" };

  it("accepts the board's request", () => {
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("needs the transaction ID and no more than the request", () => {
    expect(schema.safeParse({ ...values, trxId: " " }).error?.issues[0]?.message).toBe("Enter the transaction ID");
    expect(schema.safeParse({ ...values, paidAmount: "2161" }).error?.issues[0]?.message).toBe("More than this request");
  });

  it("refuses a time ahead of now", () => {
    expect(schema.safeParse({ ...values, paidAt: "2999-01-01T10:00" }).success).toBe(false);
  });

  it("sends the API numbers and an ISO time, without an empty note", () => {
    const parsed = markPayoutPaidServerZodSchema.parse(values);
    expect(parsed.paidAmount).toBe(2160);
    expect(parsed.paidAt).toMatch(/^2026-10-01T06:05:00\.000Z$/);
    expect(parsed).not.toHaveProperty("note");
  });
});

describe("referral settings", () => {
  const form = {
    programLive: true,
    whoCanEarn: "PAID_PLAN" as const,
    commissionPct: "20",
    friendDiscountPct: "10",
    holdDays: "7",
    minWithdrawal: "500",
    withdrawalFee: "0",
    payWithinDays: "3",
    payoutMethods: ["BKASH" as const, "NAGAD" as const],
    blockSelf: true,
    cancelOnRefund: true,
    flagSameNumber: true,
    maxPerMonth: "",
  };

  it("turns the typed numbers into the API's, a blank limit into none", () => {
    const parsed = referralSettingsServerZodSchema.parse(form);
    expect(parsed).toMatchObject({ commissionPct: 20, minWithdrawal: 500, maxPerMonth: null, payoutMethods: ["BKASH", "NAGAD"] });
    expect(referralSettingsServerZodSchema.parse({ ...form, maxPerMonth: "50" }).maxPerMonth).toBe(50);
  });

  it("keeps the fee under the minimum", () => {
    expect(getFeeError("500", "500")).toBe("Must be less than the minimum");
    expect(getFeeError("10", "500")).toBeUndefined();
    expect(referralSettingsServerZodSchema.safeParse({ ...form, withdrawalFee: "600" }).success).toBe(false);
  });

  it("needs at least one way to pay, and a percentage up to 100", () => {
    expect(referralSettingsServerZodSchema.safeParse({ ...form, payoutMethods: [] }).success).toBe(false);
    expect(referralSettingsServerZodSchema.safeParse({ ...form, commissionPct: "101" }).success).toBe(false);
  });
});
