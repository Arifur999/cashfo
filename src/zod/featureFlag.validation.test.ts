import { describe, expect, it } from "vitest";
import { featureFlagServerZodSchema, featureFlagUpdateServerZodSchema } from "./featureFlag.validation";

const validValues = {
  key: "new_dashboard_ui",
  name: "New dashboard",
  description: "",
  isEnabled: false,
  rolloutPercent: 10,
  targetPlanIds: [],
};

describe("featureFlagServerZodSchema", () => {
  it("drops an empty description", () => {
    const result = featureFlagServerZodSchema.safeParse(validValues);
    expect(result.success && result.data).toEqual({
      key: "new_dashboard_ui",
      name: "New dashboard",
      isEnabled: false,
      rolloutPercent: 10,
      targetPlanIds: [],
    });
  });

  it("only accepts snake_case keys", () => {
    expect(featureFlagServerZodSchema.safeParse({ ...validValues, key: "New-Dashboard" }).success).toBe(false);
    expect(featureFlagServerZodSchema.safeParse({ ...validValues, key: "2fa_beta" }).success).toBe(false);
    expect(featureFlagServerZodSchema.safeParse({ ...validValues, key: "beta__ui" }).success).toBe(false);
  });

  it("keeps the rollout between 0 and 100", () => {
    expect(featureFlagServerZodSchema.safeParse({ ...validValues, rolloutPercent: 101 }).success).toBe(false);
    expect(featureFlagServerZodSchema.safeParse({ ...validValues, rolloutPercent: 12.5 }).success).toBe(false);
  });
});

describe("featureFlagUpdateServerZodSchema", () => {
  it("accepts a lone toggle", () => {
    expect(featureFlagUpdateServerZodSchema.safeParse({ isEnabled: true }).success).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(featureFlagUpdateServerZodSchema.safeParse({}).success).toBe(false);
  });
});
