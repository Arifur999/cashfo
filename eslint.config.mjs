import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginQuery from "@tanstack/eslint-plugin-query";

// A class string matching `pattern`, in a plain string or a template.
const classRule = (pattern, message) => [
  { selector: `Literal[value=/${pattern.source}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern.source}/]`, message },
];

// Colour classes retired by the Cool mist palette (src/app/globals.css
// says which ground does which job). Tailwind drops a class it doesn't
// know without a word, so a leftover would just lose its colour.
const RETIRED = classRule(
  /bg-cream|var\(--cream\)|border-surface-sunken/,
  "Retired colour: use bg-page (shell), bg-table-head (column heads, group and total rows), bg-strip (footers, notes, tiles), bg-hover (row hover), bg-surface-sunken (tracks, chips, control hover) or border-divider (row separators).",
);

// Tailwind's own colour ramps (bg-neutral-100, text-amber-700), the old
// brand-* names and hex colours in a class: none of them follows dark mode
// or a later palette change, and globals.css has a token for every job.
const OFF_PALETTE = classRule(
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border(?:-[trblxyse])?|ring|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?![\w-])|brand-(?:primary|dark|danger)|\[#)/,
  "Off-palette colour: use a token from src/app/globals.css (ink, ink-2, ink-muted, line, divider, surface, strip, table-head, hover, surface-sunken, emerald, brand-ink, forest, mint-*, warning, info, expense and their -soft fills).",
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Catches the TanStack Query mistakes that compile fine but misbehave at
  // runtime (unstable query keys, missing deps in queryFn closures, ...).
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": ["error", ...RETIRED, ...OFF_PALETTE],
    },
  },
  // The data palettes give each category, book cover and skill its own
  // colour, and Google's mark keeps its colours, on purpose.
  {
    files: [
      "src/lib/customer/budgetCategoryVisuals.ts",
      "src/components/modules/Customer/HabitTracker/Books/bookPalette.ts",
      "src/components/modules/Customer/HabitTracker/Skills/skillPalette.ts",
      "src/components/modules/Auth/GoogleIcon.tsx",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...RETIRED],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
