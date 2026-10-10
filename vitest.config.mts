import { fileURLToPath } from "node:url";
import type { ViteUserConfig } from "vitest/config";

// Unit tests only, on pure logic (formatters, query-string builders, zod
// schemas, table helpers) -- no DOM, so the node environment is enough.
//
// A plain object with a type-only import instead of defineConfig(): vitest
// runs through `npx` and isn't a project dependency (see TESTING.md), so a
// runtime import of "vitest/config" from this file couldn't be resolved.
const config: ViteUserConfig = {
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
};

export default config;
