import { describe, expect, it } from "vitest";
import { ICON_NAME_PATTERN } from "@/zod/category.validation";
import { CATEGORY_ICON_NAMES, getCategoryIcon } from "./categoryIcons";

describe("CATEGORY_ICONS", () => {
  it("covers every icon the seeded categories use", () => {
    for (const name of ["briefcase", "laptop", "shopping-bag", "utensils", "car", "home", "zap", "credit-card", "shopping-cart", "film"]) {
      expect(getCategoryIcon(name), name).not.toBeNull();
    }
  });

  it("only uses names the category form accepts", () => {
    for (const name of CATEGORY_ICON_NAMES) {
      expect(ICON_NAME_PATTERN.test(name), name).toBe(true);
    }
  });
});

describe("getCategoryIcon", () => {
  it("returns null for unknown or empty names", () => {
    expect(getCategoryIcon("not-an-icon")).toBeNull();
    expect(getCategoryIcon("")).toBeNull();
    expect(getCategoryIcon(null)).toBeNull();
  });

  it("doesn't resolve inherited object keys", () => {
    expect(getCategoryIcon("toString")).toBeNull();
    expect(getCategoryIcon("constructor")).toBeNull();
  });
});
