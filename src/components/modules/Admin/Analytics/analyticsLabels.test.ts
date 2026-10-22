import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COHORT_SHADES, cohortShade, formatShortDay } from "./analyticsLabels";

// A range's span and name and the longest range are lib/analyticsWording's
// and lib/analyticsRange's, and are tested there.
describe("the chart axis", () => {
  it("writes a day in the reader's language", () => {
    expect(formatShortDay("2026-10-05")).toBe("5 Oct");
    expect(formatShortDay("2026-10-05", "bn")).toBe("৫ অক্টো");
  });
});

// The cohort shades' text against their fill, from globals.css: a cell's
// background is emerald mixed into the white card.
const css = readFileSync(new URL("../../../../app/globals.css", import.meta.url), "utf8");
const root = /^:root\s*\{([^}]*)\}/m.exec(css)?.[1] ?? "";
const token = (name: string) => {
  const hex = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(root)?.[1];
  if (!hex) throw new Error(`globals.css has no --${name}`);
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
};
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// color-mix(in srgb, emerald p%, transparent) over the white card.
const mixOverWhite = (color: number[], percent: number) => color.map((value) => (value * percent) / 100 + 255 * (1 - percent / 100));

describe("the cohort cells", () => {
  it("deepen with the share that came back", () => {
    expect(cohortShade(100).fill).toBe(100);
    expect(cohortShade(80).text).toBe("white");
    expect(cohortShade(79.9).text).toBe("forest");
    expect(cohortShade(0).fill).toBe(12);
    const fills = [5, 25, 45, 65, 95].map((percent) => cohortShade(percent).fill);
    expect(fills).toEqual([...fills].sort((a, b) => a - b));
  });

  it("keep their figure at 4.5:1 or more on every shade", () => {
    const emerald = token("emerald");
    const text = { forest: token("forest"), white: [255, 255, 255] };
    for (const shade of COHORT_SHADES) {
      expect(contrast(text[shade.text], mixOverWhite(emerald, shade.fill)), `${shade.text} on ${shade.fill}% emerald`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
