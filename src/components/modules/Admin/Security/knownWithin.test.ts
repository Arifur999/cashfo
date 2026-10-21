import { describe, expect, it } from "vitest";
import { hrefWithoutFilters, hrefWithoutUnknownWithin } from "./knownWithin";

describe("hrefWithoutUnknownWithin", () => {
  it("leaves an address without within alone", () => {
    expect(hrefWithoutUnknownWithin("/admin/security", { action: "LOGIN" })).toBeNull();
  });

  it("leaves a known window alone", () => {
    expect(hrefWithoutUnknownWithin("/admin/security/logins", { within: "7d", success: "false" })).toBeNull();
  });

  it("drops an unknown window and keeps the rest", () => {
    expect(hrefWithoutUnknownWithin("/admin/security", { within: "yesterday", action: "LOGIN", page: "2" })).toBe("/admin/security?action=LOGIN&page=2");
  });

  it("drops a repeated window, which the API also refuses", () => {
    expect(hrefWithoutUnknownWithin("/admin/security/logins", { within: ["7d", "24h"] })).toBe("/admin/security/logins");
  });

  it("keeps repeated other params", () => {
    expect(hrefWithoutUnknownWithin("/admin/security", { within: "1d", tag: ["a", "b"] })).toBe("/admin/security?tag=a&tag=b");
  });
});

describe("hrefWithoutFilters", () => {
  it("takes off the filters and the page and keeps the rest", () => {
    const current = new URLSearchParams("action=LOGIN&within=7d&page=3&entry=abc");
    expect(hrefWithoutFilters("/admin/security", current, ["action", "within"])).toBe("/admin/security?entry=abc");
  });

  it("returns the bare path when nothing else is left", () => {
    expect(hrefWithoutFilters("/admin/security/logins", new URLSearchParams("email=a%40b.c"), ["email"])).toBe("/admin/security/logins");
  });
});
