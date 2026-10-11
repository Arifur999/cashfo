import { describe, expect, it } from "vitest";
import type { INotificationTemplate } from "@/types/notification.types";
import { buildTemplateOptions, describeAudience } from "./campaignOptions";

const planNames = new Map([["plan-1", "Monthly Pro"]]);

describe("describeAudience", () => {
  it("reads naturally for every combination", () => {
    expect(describeAudience({}, planNames)).toBe("All users");
    expect(describeAudience({ status: "ACTIVE" }, planNames)).toBe("Active users");
    expect(describeAudience({ planId: "plan-1" }, planNames)).toBe("All users on Monthly Pro");
    expect(describeAudience({ planId: "plan-1", status: "PENDING_DELETION" }, planNames)).toBe("Pending deletion users on Monthly Pro");
  });

  it("copes with a plan that no longer exists", () => {
    expect(describeAudience({ planId: "gone" }, planNames)).toBe("All users on an unknown plan");
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
