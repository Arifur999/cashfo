import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Next runs a page's generateMetadata for every <Link> prefetch of it
// without rendering the page, so a read there is paid for each link on
// screen: every invoice number on a list of up to 100, the sheet's four
// recent invoices, each payment's Invoice button. A record page's tab title
// comes from its route, as the customer pages' do
// (lib/customer/pageTitle.pages.test.ts).
const ADMIN = join(process.cwd(), "src", "app", "(dashboardLayout)", "admin");
const PAGES = ["payments/[id]/page.tsx", "invoices/[id]/page.tsx"];

// A reader called from the metadata: get-anything (but the translator, which
// reads only the language cookie), a load helper, or fetchOrNotFound.
const API_READ = /\b(get(?!Translator)[A-Z]\w*|load[A-Z]\w*|fetchOrNotFound)\(/;

// The metadata's own code: a one-line export, or a function to its closing
// brace, "}" or an arrow's "};" (helpers below it are the page's).
const metadataOf = (source: string) => {
  const start = source.indexOf("generateMetadata");
  if (start < 0) return "";
  const line = source.slice(start, source.indexOf("\n", start));
  if (!line.trimEnd().endsWith("{")) return line;
  const close = /\n\};?\n/.exec(source.slice(start));
  return close ? source.slice(start, start + close.index) : source.slice(start);
};

describe("the money record pages' tab titles", () => {
  it.each(PAGES)("%s names its tab without reading the API", (page) => {
    const metadata = metadataOf(readFileSync(join(ADMIN, page), "utf8").replace(/\r\n/g, "\n"));
    expect(metadata).toMatch(/^generateMetadata\b/);
    expect(metadata).not.toMatch(API_READ);
  });
});
