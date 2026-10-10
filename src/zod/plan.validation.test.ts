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

  it("rejects -1 business workspaces (only the transaction cap allows unlimited)", () => {
    const featureLimits = { ...validPayload.featureLimits, maxBusinessWorkspaces: "-1" };
    expect(planServerZodSchema.safeParse({ ...validPayload, featureLimits }).success).toBe(false);
  });

  it("rejects a slug with uppercase letters or spaces", () => {
    expect(planServerZodSchema.safeParse({ ...validPayload, slug: "Monthly Pro" }).success).toBe(false);
  });
});

describe("planFormZodSchema", () => {
  it("accepts -1 for the monthly transaction cap", () => {
    expect(planFormZodSchema.shape.featureLimits.shape.maxTransactionsPerMonth.safeParse("-1").success).toBe(true);
  });

  it("rejects -2 for the monthly transaction cap", () => {
    expect(planFormZodSchema.shape.featureLimits.shape.maxTransactionsPerMonth.safeParse("-2").success).toBe(false);
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
