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

// English, for code with no reader to ask: tests, CSV exports, a component
// rendered outside the locale provider.
export const inEnglish: Translate = (key, values) => {
  const text = withoutContext(key);
  return values ? fillText(text, values) : text;
};
