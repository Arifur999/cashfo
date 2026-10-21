import { toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import type { FillValues } from "@/lib/i18n/fill";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { PAYMENTS_TABLE_BASE_CONFIG } from "./paymentsTable.config";

// Plain helpers for the money pages (Payments, a payment, Invoices, Revenue,
// Plans and Coupons). Pure, so a Server Component and a hydrated client cell
// print the same words and digits.

// "1 payment" / "1,234 payments", the count in the reader's digits
// ("১,২৩৪টি পেমেন্ট"). English picks the form by count; Bangla words both
// keys alike.
export const countPhrase = (t: Translate, locale: Locale, count: number, one: string, many: string, values?: FillValues): string =>
  t(count === 1 ? one : many, { ...values, count: formatCount(count, locale) });

export const PAYMENTS_LIST_HREF = "/admin/payments";

// A payment's page reads the list it was opened from (its tab, filters and
// page) from this param, so "All payments" goes back to the same rows.
export const BACK_PARAM = "back";

const LIST_KEYS: readonly string[] = [...PAYMENTS_TABLE_BASE_CONFIG.queryKeys, "page", "limit"];

// Only the named params of a query string, empty ones dropped, so whatever
// arrives in ?back= can only ever be read as a list's own query.
export const pickParams = (raw: string | null | undefined, keys: readonly string[]): string => {
  if (!raw) return "";
  const kept = new URLSearchParams();
  new URLSearchParams(raw).forEach((value, key) => {
    if (value !== "" && keys.includes(key)) kept.append(key, value);
  });
  return kept.toString();
};

// /admin/payments' own params of a query string.
export const listQuery = (raw: string | null | undefined): string => pickParams(raw, LIST_KEYS);

// A payment's page, carrying the list's query along.
export const paymentHref = (id: string, fromList?: string | null): string => {
  const query = listQuery(fromList);
  return `${PAYMENTS_LIST_HREF}/${id}${query ? `?${new URLSearchParams({ [BACK_PARAM]: query }).toString()}` : ""}`;
};

// The way back from a payment's page: the list, as it was left.
export const paymentsListHref = (back: string | string[] | null | undefined): string => {
  const query = listQuery(Array.isArray(back) ? back[0] : back);
  return query ? `${PAYMENTS_LIST_HREF}?${query}` : PAYMENTS_LIST_HREF;
};

// What narrows the payments list besides its status tab. The tabs' counts
// are all-time totals per status, so beside any of these they would
// contradict the rows under them.
export const PAYMENT_NARROWING_KEYS = ["search", "gateway", "planId", "dateFrom", "dateTo"] as const;

export const hasAnyParam = (params: { get: (key: string) => string | null }, keys: readonly string[]): boolean => keys.some((key) => Boolean(params.get(key)));

// The "Failed, last 7 days" figure counts from this moment a week ago. The
// list filters by whole Dhaka days, so its link starts on that moment's day
// (and may show a few more failures from earlier that day). Reads the clock
// unless given a moment, so, like getAppToday, call it from a server render,
// never while rendering a client component.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const failedSinceDay = (now: number = Date.now()): string => toDateInputValue(new Date(now - WEEK_MS));

// "What happened" prints a step's day only when it isn't the first step's:
// a refund made days later reads "4 Oct, 3:10 pm", while the steps of the
// payment's own day keep their seconds.
export const stepTimePattern = (at: string, firstAt: string): string => (toDateInputValue(at) === toDateInputValue(firstAt) ? "h:mm:ss aaa" : "d MMM, h:mm aaa");

// How much of a payment went back: none, all of it, or part of it.
export type RefundExtent = "none" | "full" | "part";

export const refundExtent = (amount: string | number, refund: { amount: string | number } | null | undefined): RefundExtent => {
  if (!refund) return "none";
  return Number(refund.amount) < Number(amount) ? "part" : "full";
};

// The same person's other payments the payment's page is sent: the API
// stops at the five newest, so five means there may be more.
export const OTHER_PAYMENTS_SHOWN = 5;
