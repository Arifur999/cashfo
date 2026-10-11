import { describe, expect, it } from "vitest";
import { INTEGER_PATTERN, isHttpUrl, isValidTimeZone, MONEY_PATTERN } from "./validators";

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects anything else", () => {
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("MONEY_PATTERN", () => {
  it("allows up to two decimals and nothing signed", () => {
    expect(MONEY_PATTERN.test("1500")).toBe(true);
    expect(MONEY_PATTERN.test("99.50")).toBe(true);
    expect(MONEY_PATTERN.test("99.505")).toBe(false);
    expect(MONEY_PATTERN.test("-5")).toBe(false);
  });
});

describe("INTEGER_PATTERN", () => {
  it("allows -1 for unlimited limits but no decimals", () => {
    expect(INTEGER_PATTERN.test("-1")).toBe(true);
    expect(INTEGER_PATTERN.test("2.5")).toBe(false);
  });
});

describe("isHttpUrl", () => {
  it("accepts absolute http(s) links", () => {
    expect(isHttpUrl("https://cdn.example.com/file.png")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects script, data and relative URLs", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<b>x</b>")).toBe(false);
    expect(isHttpUrl("/uploads/file.png")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });
});
