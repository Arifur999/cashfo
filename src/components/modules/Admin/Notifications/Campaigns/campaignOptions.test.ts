import { describe, expect, it } from "vitest";
import type { INotificationTemplate } from "@/types/notification.types";
import { buildTemplateOptions, describeAudience } from "./campaignOptions";

const planNames = new Map([["plan-1", "Monthly Pro"]]);

// The design's "Who gets it": "Free plan, active", "Everyone active".
describe("describeAudience", () => {
  it("reads naturally for every combination", () => {
    expect(describeAudience({}, planNames)).toBe("Everyone");
    expect(describeAudience({ status: "ACTIVE" }, planNames)).toBe("Everyone active");
    expect(describeAudience({ planId: "plan-1" }, planNames)).toBe("Monthly Pro plan");
    expect(describeAudience({ planId: "plan-1", status: "PENDING_DELETION" }, planNames)).toBe("Monthly Pro plan, pending deletion");
  });

  it("copes with a plan that no longer exists", () => {
    expect(describeAudience({ planId: "gone" }, planNames)).toBe("A removed plan");
    expect(describeAudience({ planId: "gone", status: "ACTIVE" }, planNames)).toBe("A removed plan, active");
  });
});

describe("buildTemplateOptions", () => {
  it("offers active templates only", () => {
    const templates = [
      { key: "welcome", isActive: true },
      { key: "legacy_promo", isActive: false },
    ] as INotificationTemplate[];
    expect(buildTemplateOptions(templates)).toEqual([{ value: "welcome", label: "welcome" }]);
  });
});
