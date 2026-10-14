import { describe, expect, it } from "vitest";
import { categoryTone, NEUTRAL_CATEGORY_TONE } from "./categoryTone";

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
