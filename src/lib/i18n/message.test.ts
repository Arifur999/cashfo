import { describe, expect, it } from "vitest";
import { inEnglish, plural } from "./message";

describe("plural", () => {
  it("picks the form by count and groups the count", () => {
    expect(plural(inEnglish, 1, "{count} entry", "{count} entries")).toBe("1 entry");
    expect(plural(inEnglish, 0, "{count} entry", "{count} entries")).toBe("0 entries");
    expect(plural(inEnglish, 1234, "{count} entry", "{count} entries")).toBe("1,234 entries");
  });

  it("writes the count in the reader's digits when told the locale", () => {
    expect(plural(inEnglish, 1234, "{count} entry", "{count} entries", undefined, "bn")).toBe("১,২৩৪ entries");
    expect(plural(inEnglish, 1234, "{count} entry", "{count} entries", undefined, "en")).toBe("1,234 entries");
    expect(plural(inEnglish, 2, "{count} refund in {month}", "{count} refunds in {month}", { month: "October" }, "bn")).toBe("২ refunds in October");
  });

  it("keeps a count the caller already wrote", () => {
    expect(plural(inEnglish, 3, "{count} vote", "{count} votes", { count: "৩" })).toBe("৩ votes");
    expect(plural(inEnglish, 1, "{count} vote", "{count} votes", { count: "one" }, "bn")).toBe("one vote");
  });
});
