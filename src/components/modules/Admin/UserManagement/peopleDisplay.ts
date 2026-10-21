import { formatCount } from "@/lib/i18n/digits";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// Plain helpers for the people pages (Users, a person's page, Owners,
// Workspaces). Pure, so a Server Component and a hydrated client cell print
// the same words and digits.

// Every account's own workspace is stored under this name (the backend
// creates it so at sign-up), and the customer app never shows it as a name.
// The admin shows it in the reader's language; any other name is data and
// stays as written.
export const PERSONAL_WORKSPACE_NAME = "Personal";

export const workspaceLabel = (name: string | null | undefined, t: Translate, personal: "Personal" | "Personal workspace" = "Personal"): string | null =>
  name === PERSONAL_WORKSPACE_NAME ? t(personal) : name || null;

// "1 day" / "1,234 days", the count in the reader's digits ("১,২৩৪ দিন").
// English picks the form by count; Bangla words both keys alike.
export const countPhrase = (t: Translate, locale: Locale, count: number, one: string, many: string): string =>
  t(count === 1 ? one : many, { count: formatCount(count, locale) });

const DAY_MS = 86_400_000;

// Whole days since a moment, never below 0: the backend's daysUsing. An
// unreadable date counts as today.
export const daysSince = (iso: string, now = Date.now()): number => {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  return Number.isFinite(days) && days > 0 ? days : 0;
};

// How long someone has used Smartly: "12 days", or "Joined today" on their
// first day instead of "0 days".
export const daysUsedLabel = (days: number, t: Translate, locale: Locale): string =>
  days > 0 ? countPhrase(t, locale, days, "{count} day", "{count} days") : t("Joined today");

// The words behind the "+2" chip beside a person's own workspace.
export const moreWorkspacesLabel = (extra: number, t: Translate, locale: Locale): string =>
  countPhrase(t, locale, extra, "{count} more workspace", "{count} more workspaces");

// A person's page reads the list it was opened from (its filters and page)
// from this param, so its way back returns to the same rows.
export const BACK_PARAM = "back";

// A person's link from a list, carrying that list's own query along.
export const withListState = (href: string, listQuery: string): string => {
  if (!listQuery) return href;
  const at = href.indexOf("?");
  const params = new URLSearchParams(at === -1 ? "" : href.slice(at + 1));
  params.set(BACK_PARAM, listQuery);
  return `${at === -1 ? href : href.slice(0, at)}?${params.toString()}`;
};

// The way back from a person's page: the list, with whatever of ?back= is
// that list's own (its filters, page and rows per page). It is only ever
// read as a query, so it can't lead anywhere but this list.
export const listBackHref = (listHref: string, back: string | undefined, keys: readonly string[]): string => {
  if (!back) return listHref;
  const kept = new URLSearchParams();
  new URLSearchParams(back).forEach((value, key) => {
    if (value !== "" && keys.includes(key)) kept.append(key, value);
  });
  const query = kept.toString();
  return query ? `${listHref}?${query}` : listHref;
};
