import { describe, expect, it } from "vitest";
import { rolloutLabel } from "./featureFlags";

describe("rolloutLabel", () => {
  it("says how many people an enabled flag reaches", () => {
    expect(rolloutLabel({ isEnabled: true, rolloutPercent: 100 })).toBe("Everyone");
    expect(rolloutLabel({ isEnabled: true, rolloutPercent: 25 })).toBe("25% of people");
    expect(rolloutLabel({ isEnabled: true, rolloutPercent: 0 })).toBe("Nobody");
  });

  it("keeps the share of a flag that is off for when it is switched on", () => {
    expect(rolloutLabel({ isEnabled: false, rolloutPercent: 10 })).toBe("10% once it's on");
    expect(rolloutLabel({ isEnabled: false, rolloutPercent: 0 })).toBe("Nobody");
  });

  it("writes the share in the reader's digits", () => {
    expect(rolloutLabel({ isEnabled: true, rolloutPercent: 25 }, undefined, "bn")).toBe("২৫% of people");
    expect(rolloutLabel({ isEnabled: false, rolloutPercent: 10 }, undefined, "bn")).toBe("১০% once it's on");
  });
});
