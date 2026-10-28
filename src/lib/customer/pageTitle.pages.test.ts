import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { findNavLocation, NAV_SECTIONS, queryOf } from "./nav";

// Every customer page names itself in the browser tab (customerPageMetadata),
// and the menu knows its route, so the tab never reads a bare "Smartly".
const ROOT = join(process.cwd(), "src", "app", "(customerLayout)");

// Pages that only redirect elsewhere, so the browser never shows them.
const REDIRECT_STUBS = new Set(["/budget-planning", "/income-planning", "/income-category", "/assets-management"]);

const pageFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });

// "(customerLayout)/contacts/[id]/page.tsx" is the route "/contacts/[id]".
const routeOf = (file: string) => "/" + relative(ROOT, file).split(sep).slice(0, -1).join("/");

const pages = pageFiles(ROOT).map((file) => ({ file, route: routeOf(file) }));

// A reader or guard called from the metadata: get-anything (but the
// translator, which reads only the language cookie), the Books guard, or the
// workspace resolver.
const API_READ = /\b(get(?!Translator)[A-Z]\w*|requireBusinessWorkspace|resolveActiveBusinessId)\(/;

// The metadata's own code: a one-line export, or a function to its closing
// brace (helpers below it are the page's).
const metadataOf = (source: string) => {
  const start = source.indexOf("generateMetadata");
  if (start < 0) return "";
  const line = source.slice(start, source.indexOf("\n", start));
  if (!line.trimEnd().endsWith("{")) return line;
  const end = source.indexOf("\n}\n", start);
  return source.slice(start, end > start ? end : undefined);
};

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

  // Next runs generateMetadata for every <Link> prefetch of a page without
  // rendering the page, so a read there is paid for each link on screen (a
  // list of 20 transactions cost 80 API calls). Titles come from the route.
  it.each(pages)("$route names its tab without reading the API", ({ file }) => {
    expect(metadataOf(readFileSync(file, "utf8").replace(/\r\n/g, "\n"))).not.toMatch(API_READ);
  });
});
