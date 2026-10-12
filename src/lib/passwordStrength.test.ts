import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "./passwordStrength";

describe("getPasswordStrength", () => {
  it("rates nothing until something is typed", () => {
    expect(getPasswordStrength("")).toBe(0);
  });

  it("rates anything the backend would refuse as too weak", () => {
    expect(getPasswordStrength("abc1")).toBe(1);
    expect(getPasswordStrength("abcdefghijkl")).toBe(1);
  });

  it("rewards length and variety once the rule is met", () => {
    expect(getPasswordStrength("abcd1234")).toBe(2);
    expect(getPasswordStrength("abcd1234efgh")).toBe(3);
    expect(getPasswordStrength("Abcd1234")).toBe(3);
    expect(getPasswordStrength("abcd-1234")).toBe(3);
    expect(getPasswordStrength("Abcd1234efgh!")).toBe(4);
  });
});
