import { describe, expect, it } from "vitest";
import { extractPlaceholders, fillPlaceholders, findUnknownPlaceholders, getPlaceholderError } from "./templatePlaceholders";

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

  it("asks for one fixed sentence and fills the names in after translating", () => {
    const t = (key: string, values?: Record<string, string | number>) => `${key === "Not a variable of this template: {names}" ? "এই টেমপ্লেটের ভেরিয়েবল নয়: " : key}${values?.names ?? ""}`;
    expect(getPlaceholderError("Hi {{nmae}}", ["name"], t)).toBe("এই টেমপ্লেটের ভেরিয়েবল নয়: {{nmae}}");
  });
});

describe("fillPlaceholders", () => {
  it("swaps each placeholder for its sample and leaves unknown ones alone", () => {
    expect(fillPlaceholders("Hi {{userName}}, {{planName}} ends on {{expiryDate}}", { userName: "Sharmin", planName: "Monthly Pro" })).toBe(
      "Hi Sharmin, Monthly Pro ends on {{expiryDate}}",
    );
  });
});
