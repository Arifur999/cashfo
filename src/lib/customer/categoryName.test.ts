import { describe, expect, it } from "vitest";
import { CATEGORY_NAME_WORDS, categoryNameProblem, categoryServerProblem } from "./categoryName";

describe("categoryNameProblem", () => {
  it("asks for a name when there is only space", () => {
    expect(categoryNameProblem("   ", [])).toBe("empty");
  });

  it("refuses a name past 40 characters, counting Bangla letters as one each", () => {
    expect(categoryNameProblem("a".repeat(41), [])).toBe("long");
    expect(categoryNameProblem("বাজার".repeat(8), [])).toBeNull();
  });

  it("refuses the names the app keeps, in any case", () => {
    expect(categoryNameProblem(" zakat ", [])).toBe("reserved");
    expect(categoryNameProblem("Bank Charge", [])).toBe("reserved");
    expect(categoryNameProblem("uncategorised", [])).toBe("reserved");
  });

  it("counts a name differing only in case or space as taken", () => {
    expect(categoryNameProblem("food ", ["Food"])).toBe("taken");
  });

  it("passes a new name", () => {
    expect(categoryNameProblem("Groceries", ["Food"])).toBeNull();
  });
});

describe("categoryServerProblem", () => {
  it("reads the backend's refusals in the same terms", () => {
    expect(categoryServerProblem('A budget category named "Food" already exists')).toBe("taken");
    expect(categoryServerProblem("That name is used by the app for Zakat or transfer fees")).toBe("reserved");
  });

  it("leaves any other message alone", () => {
    expect(categoryServerProblem("Forbidden")).toBeNull();
    expect(categoryServerProblem(undefined)).toBeNull();
  });
});

describe("CATEGORY_NAME_WORDS", () => {
  it("has words for every problem in both forms", () => {
    for (const words of Object.values(CATEGORY_NAME_WORDS)) expect(Object.keys(words).sort()).toEqual(["empty", "long", "reserved", "taken"]);
  });
});
