import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// WCAG 2.x contrast for the pairs the design leans on, read straight from
// globals.css in both themes, so a palette change that drops text below AA
// fails here instead of in a screenshot review. CONTRAST_REPORT=1 prints the
// whole matrix and how far apart the grounds sit (add --silent=false, since
// vitest hides a passing test's console).
//
// The one rule the numbers force: emerald and income text (both #1f7a5a) is
// 4.35:1 on sunken, under AA: text on a sunken fill uses brand-ink.

type Palette = Record<string, string>;

const source = readFileSync(new URL("./globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// The custom properties of one top-level block (:root or .dark), unresolved.
function declarations(selector: string): Record<string, string> {
  const block = new RegExp(`^${selector}\\s*\\{([^}]*)\\}`, "m").exec(source);
  if (!block) throw new Error(`globals.css has no ${selector} block`);
  return Object.fromEntries([...block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

// Follows var(--x) to a hex colour; rgba(), color-mix() and the rest are left out.
function resolve(raw: Record<string, string>): Palette {
  const lookup = (name: string, seen: Set<string>): string | undefined => {
    const value = raw[name];
    if (value === undefined || seen.has(name)) return undefined;
    const ref = /^var\(--([\w-]+)\)$/.exec(value);
    if (ref) return lookup(ref[1], new Set(seen).add(name));
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1].toLowerCase();
    if (!hex) return undefined;
    return `#${hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex}`;
  };
  const palette: Palette = {};
  for (const name of Object.keys(raw)) {
    const hex = lookup(name, new Set());
    if (hex) palette[name] = hex;
  }
  return palette;
}

const light = declarations(":root");
// .dark sits on <html> beside :root, so it overrides what it names and a
// var() on :root (--cream: var(--page)) picks up the dark value.
const THEMES: Record<string, Palette> = {
  light: resolve(light),
  dark: resolve({ ...light, ...declarations("\\.dark") }),
};

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = ["ink", "ink-2", "ink-muted", "brand-ink"];
const TEXT_GROUNDS = ["surface", "page", "strip", "table-head", "hover", "surface-sunken", "mint-50"];
// Amounts and pillar labels in coloured text. Rose is left out: it only ever
// sits on rose-soft.
const MEANING = ["income", "expense", "warning", "info", "pillar-loans", "pillar-habits", "pillar-insights"];
const EDGE_GROUNDS = ["surface", "page", "table-head"];

// Body text needs 4.5:1; borders and the focus ring 3:1 (non-text contrast).
const RULES: { fg: string[]; bg: string[]; min: number }[] = [
  { fg: TEXT, bg: TEXT_GROUNDS, min: 4.5 },
  // Not on surface-sunken: see the rule at the top.
  { fg: ["emerald"], bg: TEXT_GROUNDS.filter((ground) => ground !== "surface-sunken"), min: 4.5 },
  // Coloured amounts land on cards, the page, strips, table heads (group,
  // opening and total rows) and hovered rows; never on sunken (same rule).
  { fg: MEANING, bg: ["surface", "page", "strip", "table-head", "hover"], min: 4.5 },
  { fg: ["line-strong", "focus-ring"], bg: EDGE_GROUNDS, min: 3 },
  // shadcn's menu and select highlight.
  { fg: ["accent-foreground"], bg: ["accent"], min: 4.5 },
];

// Grounds that should read as separate bands, light ones only in light.
const BANDS: [string, string][] = [
  ["table-head", "page"],
  ["table-head", "surface"],
  ["strip", "surface"],
  ["hover", "surface"],
  ["page", "surface"],
  ["surface-sunken", "surface"],
];

function colour(palette: Palette, name: string): string {
  const hex = palette[name];
  if (!hex) throw new Error(`--${name} does not resolve to a hex colour in globals.css`);
  return hex;
}

describe.each(Object.entries(THEMES))("%s theme tokens", (theme, palette) => {
  const pairs = RULES.flatMap(({ fg, bg, min }) => fg.flatMap((text) => bg.map((ground) => ({ text, ground, min }))));

  it.each(pairs)("--$text on --$ground is at least $min:1", ({ text, ground, min }) => {
    expect(contrast(colour(palette, text), colour(palette, ground))).toBeGreaterThanOrEqual(min);
  });

  it.runIf(Boolean(process.env.CONTRAST_REPORT))("prints the contrast matrix", () => {
    const texts = [...TEXT, "emerald", ...MEANING, "ink-faint", "line-strong", "focus-ring", "accent-foreground"];
    const grounds = [...TEXT_GROUNDS, "accent"];
    const width = (ground: string) => Math.max(ground.length, 5);
    const cell = (text: string) => grounds.map((ground) => contrast(colour(palette, text), colour(palette, ground)).toFixed(2).padStart(width(ground)));
    const rows = [
      `${"".padEnd(18)} ${grounds.map((ground) => ground.padStart(width(ground))).join(" ")}`,
      ...texts.map((text) => `${text.padEnd(18)} ${cell(text).join(" ")}`),
      "",
      ...BANDS.map(([a, b]) => `${`${a} vs ${b}`.padEnd(30)} ${contrast(colour(palette, a), colour(palette, b)).toFixed(3)}`),
    ];
    console.log(`\n${theme}\n${rows.join("\n")}`);
  });
});
