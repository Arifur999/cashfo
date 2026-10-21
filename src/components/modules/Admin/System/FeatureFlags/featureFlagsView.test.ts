import { describe, expect, it } from "vitest";
import { readFlagSwitchView, showsFeatureFlag, withFlagSwitchView } from "./featureFlagsView";

describe("readFlagSwitchView", () => {
  it("opens on every flag", () => {
    expect(readFlagSwitchView(new URLSearchParams())).toBe("all");
    expect(readFlagSwitchView(new URLSearchParams("show=sideways"))).toBe("all");
  });

  it("reads On and Off", () => {
    expect(readFlagSwitchView(new URLSearchParams("show=on"))).toBe("on");
    expect(readFlagSwitchView(new URLSearchParams("show=off"))).toBe("off");
  });
});

describe("withFlagSwitchView", () => {
  it("leaves All out of the URL and keeps the other params", () => {
    expect(withFlagSwitchView(new URLSearchParams("show=on&from=dashboard"), "all").toString()).toBe("from=dashboard");
    expect(withFlagSwitchView(new URLSearchParams("from=dashboard"), "off").toString()).toBe("from=dashboard&show=off");
  });
});

describe("showsFeatureFlag", () => {
  it("splits the list by the switch", () => {
    expect(showsFeatureFlag({ isEnabled: true }, "all")).toBe(true);
    expect(showsFeatureFlag({ isEnabled: true }, "on")).toBe(true);
    expect(showsFeatureFlag({ isEnabled: true }, "off")).toBe(false);
    expect(showsFeatureFlag({ isEnabled: false }, "off")).toBe(true);
  });
});
