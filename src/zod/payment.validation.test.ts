import { describe, expect, it } from "vitest";
import { buildRefundFormZodSchema, refundServerZodSchema } from "./payment.validation";

describe("buildRefundFormZodSchema", () => {
  const schema = buildRefundFormZodSchema(799);

  it("accepts a partial refund", () => {
    expect(schema.safeParse({ amount: "300", reason: "Partial goodwill refund" }).success).toBe(true);
  });

  it("rejects more than was paid", () => {
    expect(schema.safeParse({ amount: "800", reason: "Full refund please" }).success).toBe(false);
  });

  it("requires a reason of at least 5 characters", () => {
    expect(schema.safeParse({ amount: "100", reason: "ok" }).success).toBe(false);
  });
});

describe("refundServerZodSchema", () => {
  it("coerces the Decimal-string amount the form pre-fills", () => {
    const result = refundServerZodSchema.safeParse({ amount: "799.00", reason: "Duplicate charge" });
    expect(result.success && result.data.amount).toBe(799);
  });
});
