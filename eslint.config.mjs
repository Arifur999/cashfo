import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginQuery from "@tanstack/eslint-plugin-query";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Catches the TanStack Query mistakes that compile fine but misbehave at
  // runtime (unstable query keys, missing deps in queryFn closures, ...).
  ...pluginQuery.configs["flat/recommended"],
  // Colour classes retired by the Cool mist palette (src/app/globals.css
  // says which ground does which job). Tailwind drops a class it doesn't
  // know without a word, so a leftover would just lose its colour.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/bg-cream|var\\(--cream\\)|border-surface-sunken/]",
          message: "Retired colour: use bg-page (shell), bg-table-head (column heads, group and total rows), bg-strip (footers, notes, tiles), bg-hover (row hover), bg-surface-sunken (tracks, chips, control hover) or border-divider (row separators).",
        },
        {
          selector: "TemplateElement[value.raw=/bg-cream|var\\(--cream\\)|border-surface-sunken/]",
          message: "Retired colour: use bg-page (shell), bg-table-head (column heads, group and total rows), bg-strip (footers, notes, tiles), bg-hover (row hover), bg-surface-sunken (tracks, chips, control hover) or border-divider (row separators).",
        },
      ],
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
