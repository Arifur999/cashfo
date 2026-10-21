import { describe, expect, it } from "vitest";
import { planFormZodSchema, planServerZodSchema, slugify } from "./plan.validation";

const validPayload = {
  name: "Monthly Pro",
  slug: "monthly-pro",
  billingCycle: "MONTHLY",
  price: "499",
  trialDays: "14",
  featureLimits: {
    maxWorkspaces: "2",
    maxBusinessWorkspaces: "1",
    maxTransactionsPerMonth: "-1",
    advancedReports: true,
    pdfExport: true,
    multiUser: false,
    incomeGoalTracking: true,
  },
};

describe("planServerZodSchema", () => {
  it("coerces numeric strings into the API payload", () => {
    const result = planServerZodSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(499);
      expect(result.data.trialDays).toBe(14);
      expect(result.data.featureLimits.maxTransactionsPerMonth).toBe(-1);
    }
  });

  it("rejects a decimal price, which the API's @IsInt would 400", () => {
    expect(planServerZodSchema.safeParse({ ...validPayload, price: "499.5" }).success).toBe(false);
  });

  it("accepts -1 (unlimited) business workspaces, as the seeded Business plan uses", () => {
    const featureLimits = { ...validPayload.featureLimits, maxBusinessWorkspaces: "-1" };
    expect(planServerZodSchema.safeParse({ ...validPayload, featureLimits }).success).toBe(true);
  });

  it("accepts -1 (no limit) for every count, but nothing lower", () => {
    const unlimited = { ...validPayload.featureLimits, maxWorkspaces: "-1" };
    expect(planServerZodSchema.safeParse({ ...validPayload, featureLimits: unlimited }).success).toBe(true);
    const nonsense = { ...validPayload.featureLimits, maxWorkspaces: "-2" };
    expect(planServerZodSchema.safeParse({ ...validPayload, featureLimits: nonsense }).success).toBe(false);
  });

  it("rejects a slug with uppercase letters or spaces", () => {
    expect(planServerZodSchema.safeParse({ ...validPayload, slug: "Monthly Pro" }).success).toBe(false);
  });

  it("sends a place in the order only when one is given, never a blank as 0", () => {
    const placed = planServerZodSchema.safeParse({ ...validPayload, displayOrder: "3" });
    expect(placed.success && placed.data.displayOrder).toBe(3);
    const blank = planServerZodSchema.safeParse({ ...validPayload, displayOrder: "" });
    expect(blank.success && blank.data.displayOrder).toBeUndefined();
    const left = planServerZodSchema.safeParse(validPayload);
    expect(left.success && left.data.displayOrder).toBeUndefined();
    expect(planServerZodSchema.safeParse({ ...validPayload, displayOrder: "-1" }).success).toBe(false);
    expect(planServerZodSchema.safeParse({ ...validPayload, displayOrder: "1.5" }).success).toBe(false);
  });
});

describe("planFormZodSchema", () => {
  it("accepts -1 for the monthly transaction cap", () => {
    expect(planFormZodSchema.shape.featureLimits.shape.maxTransactionsPerMonth.safeParse("-1").success).toBe(true);
  });

  it("rejects -2 for the monthly transaction cap", () => {
    expect(planFormZodSchema.shape.featureLimits.shape.maxTransactionsPerMonth.safeParse("-2").success).toBe(false);
  });

  it("takes a place in the order, or a blank for last", () => {
    const order = planFormZodSchema.shape.displayOrder;
    expect(order.safeParse("").success).toBe(true);
    expect(order.safeParse(" 12 ").success).toBe(true);
    expect(order.safeParse(undefined).success).toBe(true);
    expect(order.safeParse("first").error?.issues[0]?.message).toBe("A whole number from 0 to 9999");
    expect(order.safeParse("10000").success).toBe(false);
  });
});

describe("slugify", () => {
  it("lowercases and dashes a plan name", () => {
    expect(slugify("Monthly Pro!")).toBe("monthly-pro");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Yearly  Saver-- ")).toBe("yearly-saver");
  });
});
