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
  it("offers one colour per tile, each drawn differently", () => {
    const tiles = CATEGORY_TONE_COLORS.map((color) => JSON.stringify(categoryTone(color)));
    expect(new Set(tiles).size).toBe(CATEGORY_TONE_COLORS.length);
  });

  it("shows a twin's saved colour as the dot that draws the same tile", () => {
    for (const twin of ["lime", "cyan", "indigo", "violet"]) {
      const dot = pickerColor(twin);
      expect(dot).not.toBeNull();
      expect(categoryTone(dot)).toEqual(categoryTone(twin));
    }
    expect(pickerColor("green")).toBe("green");
    expect(pickerColor("mauve")).toBeNull();
    expect(pickerColor(null)).toBeNull();
  });
});
