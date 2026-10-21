import type { NavIcon, NavItem, NavLeaf, NavSection, NavTone } from "./nav";

// How the search palette finds a page or an action from what was typed:
// pure, so the ranking can be tested and the server never needs to know
// the menu.

// Case, spacing and Unicode form never decide a match: a Bangla letter
// typed as two code points finds the one stored as a single one.
const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase("en").replace(/\s+/g, " ").trim();

const isWordChar = (char: string) => /[\p{L}\p{M}\p{N}]/u.test(char);

// How well `text` answers `query`: 3 when it starts with it, 2 when one of
// its words does ("wal" in "Savings wallets", "do" in "To-do list"), 1
// when it only appears inside a word, 0 when it doesn't appear.
export function matchRank(query: string, text: string): number {
  const q = normalize(query);
  const s = normalize(text);
  if (!q || !s) return 0;
  if (s.startsWith(q)) return 3;
  let at = s.indexOf(q, 1);
  const inside = at !== -1;
  while (at !== -1) {
    if (!isWordChar(s[at - 1])) return 2;
    at = s.indexOf(q, at + 1);
  }
  return inside ? 1 : 0;
}

export interface MatchTexts {
  // The entry's own name, in English and in the reader's language.
  titles: string[];
  // Where it sits (its group and section) or what it does, in both
  // languages: found too, but after anything whose name matches.
  context?: string[];
}

// One score for an entry, highest first: its name (6 prefix, 5 word, 4
// inside a word) beats its context (2 prefix, 1 word); several words typed
// ("loan statement") also find an entry whose name and context hold a
// word starting with each (1). A single letter only matches the start of a
// word, or "a" would find almost everything.
export function matchScore(query: string, { titles, context = [] }: MatchTexts): number {
  const q = normalize(query);
  if (!q) return 0;
  const short = Array.from(q).length < 2;
  const rank = (text: string) => {
    const value = matchRank(q, text);
    return short && value === 1 ? 0 : value;
  };
  const title = Math.max(0, ...titles.map(rank));
  if (title > 0) return title + 3;
  const around = Math.max(0, ...context.map(rank));
  if (around >= 2) return around - 1;
  const words = q.split(" ");
  const everything = [...titles, ...context].join(" · ");
  return words.length > 1 && words.every((word) => matchRank(word, everything) >= 2) ? 1 : 0;
}

// The items that match, best first; equal scores keep the given order (the
// menu's own order), and at most `limit` of them.
export function rankMatches<T>(query: string, items: T[], textsOf: (item: T) => MatchTexts, limit = Number.POSITIVE_INFINITY): T[] {
  return items
    .map((item, index) => ({ item, index, score: matchScore(query, textsOf(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export interface PalettePage {
  // Unique, and stable across visits (the recents list stores it).
  key: string;
  href: string;
  // English keys for t(): the page's menu label, and the path above it
  // ("Money", "Wallets"), as the breadcrumb names it.
  label: string;
  trail: string[];
  icon: NavIcon;
  tone: NavTone;
}

// A menu leaf's link, with the query values it needs (the habit pages).
export const leafHref = (leaf: NavLeaf): string => (leaf.query ? `${leaf.href}?${new URLSearchParams(leaf.query)}` : leaf.href);

// Every page the palette can open: the visible menu sections with their
// groups' pages, the menu's foot, and Settings' own sections (under
// "Account › Settings", once each, however many lists name them).
export function palettePages(sections: NavSection[], foot: NavItem[], footLabel: string, settings: { href: string; label: string }[]): PalettePage[] {
  const pages: PalettePage[] = [];
  const seen = new Set<string>();
  const add = (leaf: NavLeaf, trail: string[], item: NavItem, tone: NavTone) => {
    const href = leafHref(leaf);
    // One entry per name per place: the nav and Settings both list
    // "Profile", at two addresses.
    const place = `${trail.join(" › ")} › ${leaf.label}`;
    if (seen.has(place)) return;
    seen.add(place);
    pages.push({ key: `${href}#${leaf.label}`, href, label: leaf.label, trail, icon: item.icon, tone });
  };
  const addItem = (item: NavItem, trail: string[], sectionTone: NavTone) => {
    const tone = item.tone ?? sectionTone;
    add(item, trail, item, tone);
    for (const sub of item.subs ?? []) add(sub, [...trail, item.label], item, tone);
  };
  for (const section of sections) {
    for (const item of section.items) addItem(item, section.label ? [section.label] : [], section.tone);
  }
  for (const item of foot) addItem(item, [footLabel], "neutral");
  // Each Settings section under the foot item whose address holds it.
  for (const section of settings) {
    const parent = foot
      .filter((item) => section.href === item.href || section.href.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0];
    if (parent) add(section, [footLabel, parent.label], parent, parent.tone ?? "neutral");
  }
  return pages;
}
