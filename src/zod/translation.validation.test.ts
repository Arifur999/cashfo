import { describe, expect, it } from "vitest";
import { translationServerZodSchema, translationTextServerZodSchema } from "./translation.validation";

const validValues = { key: "dashboard.total_income", en: "Total income", bn: "মোট আয়", context: "dashboard" };

describe("translationServerZodSchema", () => {
  it("passes a complete string through", () => {
    const result = translationServerZodSchema.safeParse(validValues);
    expect(result.success && result.data).toEqual(validValues);
  });

  it("drops a blank context and allows the Bangla text to come later", () => {
    const result = translationServerZodSchema.safeParse({ ...validValues, bn: "", context: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ key: "dashboard.total_income", en: "Total income", bn: "" });
    }
  });

  it("only accepts dotted lowercase keys", () => {
    expect(translationServerZodSchema.safeParse({ ...validValues, key: "Dashboard.TotalIncome" }).success).toBe(false);
    expect(translationServerZodSchema.safeParse({ ...validValues, key: "dashboard..income" }).success).toBe(false);
    expect(translationServerZodSchema.safeParse({ ...validValues, key: "dashboard total" }).success).toBe(false);
  });

  it("requires the English text", () => {
    expect(translationServerZodSchema.safeParse({ ...validValues, en: "  " }).success).toBe(false);
  });
});

describe("translationTextServerZodSchema", () => {
  it("lets a Bangla text be cleared but not an English one", () => {
    expect(translationTextServerZodSchema.safeParse({ language: "bn", value: "" }).success).toBe(true);
    expect(translationTextServerZodSchema.safeParse({ language: "en", value: " " }).success).toBe(false);
  });

  it("rejects an unknown language", () => {
    expect(translationTextServerZodSchema.safeParse({ language: "fr", value: "Bonjour" }).success).toBe(false);
  });
});
