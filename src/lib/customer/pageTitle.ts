import "server-only";
import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/locale";
import { findNavLocation, NAV_SECTIONS, queryOf, titleFor, type PageQuery } from "./nav";

interface PageTitleOptions {
  // The page's awaited searchParams: the habit pages share one route and
  // differ by ?category=.
  query?: PageQuery;
  // A record page's own name ("Rahim", a goal's name), already in the
  // reader's language. It goes first, before the page's name.
  record?: string | null;
}

// A customer page's tab title in the reader's language, named the way the
// menu names the page; the root layout adds "| Smartly":
//   export const generateMetadata = () => customerPageMetadata("/balance/transfer");
// gives "Transfer · Wallets | Smartly". Every section counts, Books and
// Loans included, so the title names the page whatever the menu shows. A
// page the menu doesn't know keeps the plain "Smartly".
export async function customerPageMetadata(pathname: string, { query, record }: PageTitleOptions = {}): Promise<Metadata> {
  const location = findNavLocation(pathname, queryOf(query), NAV_SECTIONS);
  const name = record?.trim();
  if (!location) return name ? { title: name } : {};
  const { t } = await getTranslator();
  return { title: titleFor(location, t, name) };
}
