import { describe, expect, it } from "vitest";
import { categoryServerZodSchema, NO_LINKED_ACCOUNT } from "./category.validation";

const validValues = {
  name: "Groceries",
  nameBn: "মুদি",
  type: "EXPENSE",
  icon: "shopping-cart",
  linkedAccountTemplateId: "6a1c5a52-4ec4-4f0b-9a54-1a5ad2d3f0a1",
  displayOrder: "3",
};

describe("categoryServerZodSchema", () => {
  it("builds the API payload", () => {
    const result = categoryServerZodSchema.safeParse(validValues);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ...validValues, displayOrder: 3 });
    }
  });

  it("sends a blank icon and an unlinked account as null", () => {
    const result = categoryServerZodSchema.safeParse({ ...validValues, icon: "", linkedAccountTemplateId: NO_LINKED_ACCOUNT });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBeNull();
      expect(result.data.linkedAccountTemplateId).toBeNull();
    }
  });

  it("only accepts kebab-case icon names", () => {
    expect(categoryServerZodSchema.safeParse({ ...validValues, icon: "Shopping Cart" }).success).toBe(false);
    expect(categoryServerZodSchema.safeParse({ ...validValues, icon: "shopping-" }).success).toBe(false);
  });

  it("rejects a direction other than income or expense", () => {
    expect(categoryServerZodSchema.safeParse({ ...validValues, type: "TRANSFER" }).success).toBe(false);
  });
});
