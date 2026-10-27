import { describe, expect, it } from "vitest";
import { CATEGORY_TONE_COLORS, categoryTone, NEUTRAL_CATEGORY_TONE, pickerColor } from "./categoryTone";

describe("categoryTone", () => {
  it("maps every budget colour onto a design category colour", () => {
    for (const color of ["blue", "green", "purple", "orange", "pink", "yellow", "red", "indigo", "teal", "cyan", "violet", "lime"]) {
      expect(categoryTone(color)).not.toEqual(NEUTRAL_CATEGORY_TONE);
    }
  });

  it("falls back to grey for an unknown or missing colour", () => {
    expect(categoryTone("mauve")).toEqual(NEUTRAL_CATEGORY_TONE);
    expect(categoryTone(null)).toEqual(NEUTRAL_CATEGORY_TONE);
  });
});

describe("CATEGORY_TONE_COLORS / pickerColor", () => {
  it("offers one colour per dot, each inked differently", () => {
    const inks = CATEGORY_TONE_COLORS.map((color) => categoryTone(color).fg);
    expect(new Set(inks).size).toBe(CATEGORY_TONE_COLORS.length);
  });

  it("offers all twelve saved colour names as their own dots", () => {
    expect(CATEGORY_TONE_COLORS).toHaveLength(12);
    for (const color of ["lime", "cyan", "indigo", "violet"]) expect(pickerColor(color)).toBe(color);
    expect(pickerColor("green")).toBe("green");
    expect(pickerColor("mauve")).toBeNull();
    expect(pickerColor(null)).toBeNull();
  });
});
