import { describe, expect, it } from "vitest";
import { extractPlaceholders, findUnknownPlaceholders, getPlaceholderError } from "./templatePlaceholders";

describe("extractPlaceholders", () => {
  it("finds each placeholder once, tolerating inner spaces", () => {
    expect(extractPlaceholders("Hi {{userName}}, your {{ planName }} plan for {{userName}}")).toEqual(["userName", "planName"]);
  });

  it("ignores text that only looks similar", () => {
    expect(extractPlaceholders("{single} {{ }} {{9lives}} {{a-b}}")).toEqual([]);
  });
});

describe("findUnknownPlaceholders", () => {
  it("lists placeholders the template doesn't declare", () => {
    expect(findUnknownPlaceholders("Hi {{userName}}, pay {{amout}}", ["userName", "amount"])).toEqual(["amout"]);
  });
});

describe("getPlaceholderError", () => {
  it("is quiet when every placeholder is declared", () => {
    expect(getPlaceholderError("Hi {{userName}}", ["userName"])).toBeUndefined();
  });

  it("names the offending placeholders", () => {
    expect(getPlaceholderError("{{foo}} and {{bar}}", [])).toBe("Not a variable of this template: {{foo}}, {{bar}}");
  });
});
