import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { translate } from "@/lib/i18n/translate";
import { BUDGET_CATEGORY_ICONS, guessCategoryIcon, iconLabelKey, iconMatches } from "./budgetCategoryVisuals";

const bangla = (key: string) => translate("bn", key);

describe("iconMatches", () => {
  it("finds an icon by its key, its English label or its Bangla one", () => {
    expect(iconMatches("bus", "bus", bangla)).toBe(true);
    expect(iconMatches("food", "dining", bangla)).toBe(true);
    expect(iconMatches("bus", "বাস", bangla)).toBe(true);
    expect(iconMatches("house", "ভাড়া", bangla)).toBe(true);
    expect(iconMatches("bus", "rent", bangla)).toBe(false);
  });

  it("matches everything for an empty search", () => {
    expect(iconMatches("bus", "  ", bangla)).toBe(true);
  });

  it("matches ড় typed as one letter or as ড with its dot", () => {
    expect(iconMatches("house", "ভাড়া", bangla)).toBe(true);
    expect(iconMatches("house", "ভাড়া", bangla)).toBe(true);
  });

  // The picker's names and its Bangla search go through these keys.
  it("has a Bangla name for every icon", () => {
    for (const icon of BUDGET_CATEGORY_ICONS) {
      expect(bnDictionary[iconLabelKey(icon)], iconLabelKey(icon)).toBeTruthy();
    }
  });

  it("names an icon in English without its context mark", () => {
    expect(translate("en", iconLabelKey("sun"))).toBe("Sun");
  });
});

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
