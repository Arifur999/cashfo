import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "./passwordStrength";

describe("getPasswordStrength", () => {
  it("rates nothing until something is typed", () => {
    expect(getPasswordStrength("")).toBe(0);
  });

  it("rates a password the backend would refuse by how many rules it meets", () => {
    expect(getPasswordStrength("abc")).toBe(1);
    expect(getPasswordStrength("abc1")).toBe(2);
    expect(getPasswordStrength("abcdefghijkl")).toBe(2);
  });

  it("rates the rule met as good, and length or variety on top as strong", () => {
    expect(getPasswordStrength("taka2026")).toBe(3);
    expect(getPasswordStrength("abcd1234efgh")).toBe(4);
    expect(getPasswordStrength("Abcd1234")).toBe(4);
    expect(getPasswordStrength("abcd-1234")).toBe(4);
    expect(getPasswordStrength("Abcd1234efgh!")).toBe(4);
  });
});
