import { formatMonthKey, toDateInputValue } from "@/lib/date";
import type { IAdminReferralRow } from "@/types/referral.types";
import type { IMrrHistoryPoint } from "@/types/revenue.types";

// Plain helpers for the Revenue page and the plans' chart. Pure, so they
// are tested on their own.

const oneDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, "");

// A bar's label, short enough for a phone's 30px column: "850", "6.2k",
// "60k", "125k", "1.3M". The card says the figures are taka.
export const compactAmount = (value: number): string => {
  const size = Math.abs(value);
  if (size < 1000) return String(Math.round(value));
  if (size < 9950) return `${oneDecimal(value / 1000)}k`;
  if (size < 999_500) return `${Math.round(value / 1000)}k`;
  return `${oneDecimal(value / 1_000_000)}M`;
};

// "2026-10" -> the key of its short name on a chart's axis ("Oct", "অক্টো"
// in Bangla). The context keeps it apart from any other "Oct".
export const shortMonthKey = (month: string): string => `${formatMonthKey(month, false)}@@month`;

// The MRR the payments say there is now: the history's last month, which
// ends at this moment. The same people the paid-people count is made of.
export const paymentsMrrNow = (history: IMrrHistoryPoint[]): number => history[history.length - 1]?.mrr ?? 0;

// "2026-10": the platform's month an instant falls in.
export const dhakaMonthKey = (at: string | Date): string => toDateInputValue(at).slice(0, 7);

// How many friends paid their first plan in this month: the commissions
// the referrals list shows with a payment made then (a refunded one still
// counts, as the paid-people figure does).
export const referredPaidThisMonth = (referrals: Pick<IAdminReferralRow, "kind" | "payment">[], month: string): number =>
  referrals.filter((referral) => referral.kind === "COMMISSION" && referral.payment?.paidAt && (referral.payment.status === "SUCCESS" || referral.payment.status === "REFUNDED") && dhakaMonthKey(referral.payment.paidAt) === month).length;
