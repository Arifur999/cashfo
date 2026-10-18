import { describe, expect, it } from "vitest";
import { guessCategoryIcon } from "./budgetCategoryVisuals";

describe("guessCategoryIcon", () => {
  it("finds an icon in a category's name", () => {
    expect(guessCategoryIcon("Food & Dining")).toBe("utensils");
    expect(guessCategoryIcon("House Rent")).toBe("house");
    expect(guessCategoryIcon("Transport")).toBe("bus");
    expect(guessCategoryIcon("Salary")).toBe("salary");
    expect(guessCategoryIcon("Bills & Utilities")).toBe("lightbulb");
  });

  it("finds nothing in a name it doesn't know", () => {
    expect(guessCategoryIcon("Zakat")).toBeNull();
  });
});
