import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { findNavLocation, NAV_SECTIONS, queryOf } from "./nav";

// Every customer page names itself in the browser tab (customerPageMetadata),
// and the menu knows its route, so the tab never reads a bare "Smartly".
const ROOT = join(process.cwd(), "src", "app", "(customerLayout)");

// Pages that only redirect elsewhere, so the browser never shows them.
const REDIRECT_STUBS = new Set(["/budget-planning", "/income-planning", "/assets-management"]);

const pageFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });

// "(customerLayout)/contacts/[id]/page.tsx" is the route "/contacts/[id]".
const routeOf = (file: string) => "/" + relative(ROOT, file).split(sep).slice(0, -1).join("/");

const pages = pageFiles(ROOT).map((file) => ({ file, route: routeOf(file) }));

describe("customer page titles", () => {
  it("finds the customer pages", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  it.each(pages.filter(({ route }) => !REDIRECT_STUBS.has(route)))("$route has a tab title", ({ file, route }) => {
    expect(readFileSync(file, "utf8")).toMatch(/export (const|async function) generateMetadata\b/);
    // A record page is titled under its list, so any id stands in for it.
    const pathname = route.replace(/\[[^\]]+\]/g, "sample-id");
    expect(findNavLocation(pathname, queryOf(undefined), NAV_SECTIONS), `the menu doesn't know ${route}`).not.toBeNull();
  });
});
