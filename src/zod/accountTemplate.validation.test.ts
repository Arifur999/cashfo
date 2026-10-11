import { describe, expect, it } from "vitest";
import { accountTemplateServerZodSchema } from "./accountTemplate.validation";

const validValues = {
  name: "  Cash  ",
  nameBn: "নগদ",
  accountType: "ASSET",
  accountSubtype: "",
  appliesTo: ["PERSONAL", "BUSINESS"],
  displayOrder: "2",
};

describe("accountTemplateServerZodSchema", () => {
  it("trims names, numbers the order and sends a blank subtype as null", () => {
    const result = accountTemplateServerZodSchema.safeParse(validValues);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Cash",
        nameBn: "নগদ",
        accountType: "ASSET",
        accountSubtype: null,
        appliesTo: ["PERSONAL", "BUSINESS"],
        displayOrder: 2,
      });
    }
  });

  it("keeps a given subtype", () => {
    const result = accountTemplateServerZodSchema.safeParse({ ...validValues, accountSubtype: "cash" });
    expect(result.success && result.data.accountSubtype).toBe("cash");
  });

  it("needs at least one workspace type", () => {
    expect(accountTemplateServerZodSchema.safeParse({ ...validValues, appliesTo: [] }).success).toBe(false);
  });

  it("rejects GROUP, which has no chart of accounts", () => {
    expect(accountTemplateServerZodSchema.safeParse({ ...validValues, appliesTo: ["GROUP"] }).success).toBe(false);
  });

  it("rejects a negative or fractional display order", () => {
    expect(accountTemplateServerZodSchema.safeParse({ ...validValues, displayOrder: "-1" }).success).toBe(false);
    expect(accountTemplateServerZodSchema.safeParse({ ...validValues, displayOrder: "1.5" }).success).toBe(false);
  });

  it("requires the Bangla name", () => {
    expect(accountTemplateServerZodSchema.safeParse({ ...validValues, nameBn: " " }).success).toBe(false);
  });
});
