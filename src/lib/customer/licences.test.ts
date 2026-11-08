import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OPEN_SOURCE_PACKAGES } from "./licences";

describe("OPEN_SOURCE_PACKAGES", () => {
  it("lists every package the app ships, so the licences page stays true (node scripts/licences.mjs)", () => {
    const { dependencies } = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(OPEN_SOURCE_PACKAGES.map((one) => one.name)).toEqual(Object.keys(dependencies).sort());
  });

  it("names a licence for each", () => {
    expect(OPEN_SOURCE_PACKAGES.filter((one) => !one.licence)).toEqual([]);
  });
});
