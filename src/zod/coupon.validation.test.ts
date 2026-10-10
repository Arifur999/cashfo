import { describe, expect, it } from "vitest";
import { createCouponServerZodSchema, getValidityError, updateCouponServerZodSchema } from "./coupon.validation";

const values = {
  code: "welcome20",
  discountType: "PERCENTAGE",
  discountValue: "20",
  maxRedemptions: "",
  validFrom: "2026-10-01",
  validUntil: "2026-10-31",
  applicablePlans: [],
  isActive: true,
};

describe("createCouponServerZodSchema", () => {
  it("uppercases the code, clears an empty cap and spans whole Dhaka days", () => {
    const result = createCouponServerZodSchema.safeParse(values);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("WELCOME20");
      expect(result.data.maxRedemptions).toBeNull();
      expect(result.data.validFrom).toBe("2026-09-30T18:00:00.000Z");
      expect(result.data.validUntil).toBe("2026-10-31T17:59:59.999Z");
    }
  });

  it("never sends isActive, which CreateCouponDto rejects", () => {
    const result = createCouponServerZodSchema.safeParse(values);
    expect(result.success && "isActive" in result.data).toBe(false);
  });

  it("rejects a percentage above 100", () => {
    expect(createCouponServerZodSchema.safeParse({ ...values, discountValue: "120" }).success).toBe(false);
  });

  it("allows a fixed amount above 100", () => {
    expect(createCouponServerZodSchema.safeParse({ ...values, discountType: "FIXED_AMOUNT", discountValue: "500" }).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(createCouponServerZodSchema.safeParse({ ...values, validUntil: "2026-09-30" }).success).toBe(false);
  });
});

describe("updateCouponServerZodSchema", () => {
  it("keeps isActive for edits", () => {
    const result = updateCouponServerZodSchema.safeParse({ ...values, isActive: false });
    expect(result.success && result.data.isActive).toBe(false);
  });
});

describe("getValidityError", () => {
  it("accepts a single-day window", () => {
    expect(getValidityError("2026-10-31", "2026-10-31")).toBeUndefined();
  });
});
