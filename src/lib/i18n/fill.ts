import { createElement, Fragment, type ReactNode } from "react";

// A sentence keeps its words in the reader's order, so the parts that change
// are placeholders filled in after translating: "{count} tries" becomes
// "৩ বার চেষ্টা", not "৩ চেষ্টা" glued from pieces. Only single braces count,
// so a template's {{name}} quoted in a sentence stays as written.
const PLACEHOLDER = /(?<!\{)\{(\w+)\}(?!\})/g;

export type FillValues = Record<string, string | number>;

export const fillText = (text: string, values: FillValues): string =>
  text.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : match));

// The same with rich parts (a bold amount, a link): the sentence comes back
// in pieces, each value in its place. A placeholder with no value stays.
export const fillNodes = (text: string, values: Record<string, ReactNode>): ReactNode[] => {
  const parts: ReactNode[] = [];
  let from = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const [whole, name] = match;
    if (!Object.hasOwn(values, name)) continue;
    if (match.index > from) parts.push(text.slice(from, match.index));
    parts.push(createElement(Fragment, { key: `${name}@${match.index}` }, values[name]));
    from = match.index + whole.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
};
