import { describe, expect, it } from "vitest";
import { categoryNameError, categoryServerError } from "./categoryName";

describe("categoryNameError", () => {
  it("asks for a name when there is only space", () => {
    expect(categoryNameError("   ", [])).toBe("Type a name first.");
  });

  it("refuses the names the app keeps, in any case", () => {
    expect(categoryNameError(" zakat ", [])).toBe("That name is used by the app for Zakat or transfer fees");
    expect(categoryNameError("Bank Charge", [])).toBe("That name is used by the app for Zakat or transfer fees");
    expect(categoryNameError("uncategorised", [])).toBe("That name is used by the app for Zakat or transfer fees");
  });

  it("counts a name differing only in case or space as taken", () => {
    expect(categoryNameError("food ", ["Food"])).toBe("That category already exists.");
  });

  it("passes a new name", () => {
    expect(categoryNameError("Groceries", ["Food"])).toBeNull();
  });
});

describe("categoryServerError", () => {
  it("reads the backend's English duplicate text as the plain sentence", () => {
    expect(categoryServerError('A budget category named "Food" already exists')).toBe("That category already exists.");
  });

  it("keeps any other message, and has one when there is none", () => {
    expect(categoryServerError("Forbidden")).toBe("Forbidden");
    expect(categoryServerError(undefined)).toBe("Failed to create category");
  });
});
