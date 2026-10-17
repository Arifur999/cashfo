import { formatNumber } from "@/lib/number";
import { type FillValues, fillText } from "./fill";

// How code outside React (lib/ helpers that build a sentence) gets its words:
// a component passes useLocale().translate, and everything else gets English.
export type Translate = (key: string, values?: FillValues) => string;

// A word that reads differently by meaning carries its meaning after "@@"
// ("On@@record" is the audit log's "what it was on", not a switch's "On").
// English shows the part before it; Bangla looks the whole key up.
const CONTEXT_MARK = "@@";
export const withoutContext = (key: string) => {
  const at = key.indexOf(CONTEXT_MARK);
  return at === -1 ? key : key.slice(0, at);
};

// A status word, which can read differently from the same word on a button:
// "Open@@status" is খোলা, a button's "Open" is খুলুন.
export const asStatus = (label: string) => `${label}@@status`;

// A record's own name in the reader's language: its Bangla twin when it has
// one (account templates and categories keep both), else the English.
export const localName = (locale: "en" | "bn", item: { name: string; nameBn?: string | null }) =>
  locale === "bn" && item.nameBn?.trim() ? item.nameBn : item.name;

// English, for code with no reader to ask: tests, CSV exports, a component
// rendered outside the locale provider.
export const inEnglish: Translate = (key, values) => {
  const text = withoutContext(key);
  return values ? fillText(text, values) : text;
};

// "{count} entry" or "{count} entries": English picks the form by count and
// Bangla words both keys alike. The count arrives formatted ("1,234").
export const plural = (t: Translate, count: number, one: string, many: string, values?: FillValues) =>
  t(count === 1 ? one : many, { ...values, count: formatNumber(count) });
