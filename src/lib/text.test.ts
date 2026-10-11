import { describe, expect, it } from "vitest";
import { getInitials, pluralize, truncate } from "./text";

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Rafiqul Islam Khan")).toBe("RI");
  });

  it("copes with extra whitespace and single names", () => {
    expect(getInitials("  tanvir  ")).toBe("T");
  });
});

describe("truncate", () => {
  it("cuts long text with an ellipsis", () => {
    expect(truncate("Export spins forever", 10)).toBe("Export spi…");
  });

  it("leaves short text alone and falls back for empty values", () => {
    expect(truncate("Short", 10)).toBe("Short");
    expect(truncate(null, 10)).toBe("—");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "message")).toBe("1 message");
  });

  it("adds an s, or uses the given plural", () => {
    expect(pluralize(0, "message")).toBe("0 messages");
    expect(pluralize(3, "reply", "replies")).toBe("3 replies");
  });

  it("groups thousands", () => {
    expect(pluralize(1200, "vote")).toBe("1,200 votes");
  });
});
