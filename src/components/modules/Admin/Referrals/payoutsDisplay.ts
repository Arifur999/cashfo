import { METHOD_BRANDS, bankShortName, formatWalletNumber, maskAccount } from "@/lib/customer/referralDisplay";
import type { BadgeTone } from "@/lib/statusBadge";
import type { CommissionStatus, IPayoutCheck, IPayoutDetail, IPayoutMethodSnapshot, IPayoutRow, PayoutCheckKey, PayoutStatus } from "@/types/referral.types";

// Plain helpers for Admin > Referrals & Payouts: how a request's method,
// checks, status and next step read. Pure, so the table, the drawer and the
// tests agree.

export const REFERRALS_HREF = "/admin/referrals";
export const REFERRALS_LIST_HREF = "/admin/referrals/list";
export const REFERRAL_SETTINGS_HREF = "/admin/referrals/settings";

// ?payout=<id> opens that request's drawer over the desk (the admin bell's
// "payout requested" links here).
export const PAYOUT_PARAM = "payout";
export const payoutHref = (id: string) => `${REFERRALS_HREF}?${PAYOUT_PARAM}=${encodeURIComponent(id)}`;

// The service's name, as the brand writes it.
export const methodName = (method: Pick<IPayoutMethodSnapshot, "type">): string => METHOD_BRANDS[method.type].name;

// "bKash 01711-482915", "BRAC Bank •••• 2201": where the money goes. The
// whole wallet number shows: the admin types it into the app to send.
export const payoutDestination = (method: IPayoutMethodSnapshot): string =>
  method.type === "BANK" ? `${bankLabel(method.bankName)} ${maskAccount(method.accountNumber)}` : `${methodName(method)} ${formatWalletNumber(method.walletNumber)}`;

// A bank by its name, or its short name when the name is long ("DBBL").
const bankLabel = (bankName: string | null): string => (!bankName ? "Bank" : bankName.length > 12 ? bankShortName(bankName) : bankName);

// The number to copy into the app or the bank's form.
export const payoutNumber = (method: IPayoutMethodSnapshot): string =>
  method.type === "BANK" ? (method.accountNumber ?? "") : formatWalletNumber(method.walletNumber);

// The line under it: the name on the account, and a bank's branch.
export const payoutAccountLine = (method: IPayoutMethodSnapshot): string => [method.accountName, method.type === "BANK" ? method.branch : null].filter(Boolean).join(" · ");

export interface CheckLine {
  ok: boolean;
  // A dictionary key, with its values.
  text: string;
  values?: Record<string, string | number>;
}

// What each check says, when it passed and when it didn't.
const CHECK_WORDS: Record<PayoutCheckKey, { ok: string; fail: string }> = {
  NAME_MATCHES: { ok: "Name matches", fail: "Name doesn't match" },
  CODE_CONFIRMED: { ok: "Code confirmed", fail: "No code confirmed" },
  HOLDS_OVER: { ok: "Holds over", fail: "Still on hold" },
  NO_REFUNDS: { ok: "No refunds", fail: "A friend was refunded" },
  FRIEND_PAID_FROM_THIS_NUMBER: { ok: "Friends paid from other numbers", fail: "Friend paid from this number" },
  WRONG_NUMBER_FOR_METHOD: { ok: "A {method} number", fail: "Not a {method} number" },
};

export const checkLine = (check: IPayoutCheck, method: Pick<IPayoutMethodSnapshot, "type">): CheckLine => ({
  ok: check.ok,
  text: check.ok ? CHECK_WORDS[check.key].ok : CHECK_WORDS[check.key].fail,
  values: check.key === "WRONG_NUMBER_FOR_METHOD" ? { method: methodName(method) } : undefined,
});

// Any check that didn't pass: a waiting request with one "needs a look".
export const hasWarnings = (row: Pick<IPayoutRow, "checks">): boolean => row.checks.some((check) => !check.ok);

// The two lines of the Checks column: a paid request shows its transaction
// ID; a closed one only what went wrong; an open one its warnings first,
// then what passed.
export const rowChecks = (row: Pick<IPayoutRow, "checks" | "status" | "trxId" | "method">): CheckLine[] => {
  if (row.status === "PAID") return row.trxId ? [{ ok: true, text: "TrxID {id}", values: { id: row.trxId } }] : [];
  const failing = row.checks.filter((check) => !check.ok);
  const passing = row.checks.filter((check) => check.ok);
  const shown = row.status === "REJECTED" || row.status === "CANCELLED" ? failing : [...failing, ...passing];
  return shown.slice(0, 2).map((check) => checkLine(check, row.method));
};

// The status chip: amber waiting, blue approved, green paid, red rejected.
export const PAYOUT_STATUS_CHIP: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  REQUESTED: { label: "Requested@@payout", tone: "warning" },
  APPROVED: { label: "Approved@@payout", tone: "info" },
  PAID: { label: "Paid@@payout", tone: "success" },
  REJECTED: { label: "Rejected@@payout", tone: "danger" },
  CANCELLED: { label: "Cancelled@@referral", tone: "neutral" },
};

export type RowAction = "reject" | "review" | "pay" | "view";

// What the Action column offers. A waiting request is approved only from
// its review, where each friend payment is checked. Those who can only
// look get View.
export const rowActions = (row: Pick<IPayoutRow, "status" | "checks">, canManage: boolean): RowAction[] => {
  if (!canManage) return ["view"];
  if (row.status === "REQUESTED") return ["review", "reject"];
  if (row.status === "APPROVED") return ["pay"];
  return ["view"];
};

// The quiet line under the status chip, as a dictionary key and the day it
// names (null: none).
export const statusNote = (row: Pick<IPayoutRow, "status" | "checks">): { text: string; withDay: boolean } => {
  switch (row.status) {
    case "REQUESTED":
      return hasWarnings(row) ? { text: "Needs a look", withDay: false } : { text: "{day}", withDay: true };
    case "APPROVED":
    case "PAID":
      return { text: "On {day}", withDay: true };
    case "REJECTED":
      return { text: "Money returned", withDay: false };
    default:
      return { text: "Cancelled by the member", withDay: false };
  }
};

// --- Every commission ---

export const COMMISSION_STATUS_CHIP: Record<CommissionStatus, { label: string; tone: BadgeTone }> = {
  ON_HOLD: { label: "On hold", tone: "warning" },
  AVAILABLE: { label: "Available@@referral", tone: "success" },
  IN_WITHDRAWAL: { label: "In withdrawal", tone: "info" },
  UNDER_CHECK: { label: "Under check", tone: "warning" },
  PAID_OUT: { label: "Paid out@@referral", tone: "info" },
  REVERSED: { label: "Reversed", tone: "danger" },
  CANCELLED: { label: "Not counted", tone: "neutral" },
};

// Why a commission earned nothing or was taken back, in words.
export const CANCEL_REASON_TEXT: Record<string, string> = {
  FRIEND_REFUNDED: "The friend was refunded",
  REFERRER_NOT_ON_PAID_PLAN: "The member wasn't on a paid plan",
  PROGRAM_OFF: "The program was paused",
  ADMIN: "Cancelled by an admin",
};

// What an admin can do with a line (the API refuses the rest): cancel one
// that isn't in a request being paid, and release one held for a check.
export const canCancelCommission = (status: CommissionStatus): boolean => status === "ON_HOLD" || status === "AVAILABLE" || status === "UNDER_CHECK";
export const canReleaseCommission = (status: CommissionStatus): boolean => status === "UNDER_CHECK";

// The payment's gateway as people say it.
export const GATEWAY_NAMES: Record<string, string> = { BKASH: "bKash", NAGAD: "Nagad", SSLCOMMERZ: "SSLCommerz", CARD: "Card", MANUAL: "Manual" };

// --- The settings' worked example ---

// The friend's discount is whole taka, rounded down; the commission is a
// share of what the friend paid, rounded down to the paisa -- as the API
// works them out.
export const referralExample = (price: number, friendDiscountPct: number, commissionPct: number) => {
  const pricePaisa = Math.round(price * 100);
  const discountPaisa = friendDiscountPct > 0 ? Math.min(Math.floor((pricePaisa * friendDiscountPct) / 100 / 100) * 100, pricePaisa) : 0;
  const friendPaysPaisa = pricePaisa - discountPaisa;
  const commissionPaisa = commissionPct > 0 ? Math.floor((friendPaysPaisa * Math.round(commissionPct * 100)) / 10_000) : 0;
  return { price, friendPays: friendPaysPaisa / 100, commission: commissionPaisa / 100, youKeep: (friendPaysPaisa - commissionPaisa) / 100 };
};

// --- What the desk checks before paying ---

export interface DeskLine {
  ok: boolean;
  // A dictionary key and its values; `value` is the figure on the right.
  text: string;
  values?: Record<string, string | number>;
  value?: string;
}

// The request's checks in words, warnings first: the name on the account,
// the code, the refund windows, refunds, a friend paying from the member's
// own number, and a number that doesn't fit its service.
export const deskChecks = (detail: Pick<IPayoutDetail, "checks" | "method" | "codeConfirmedAt" | "lines">, moment: (iso: string) => string): DeskLine[] => {
  const lines: DeskLine[] = detail.checks.map((check) => {
    switch (check.key) {
      case "NAME_MATCHES":
        return { ok: check.ok, text: check.ok ? "Account name matches the profile" : "Account name differs from the profile", value: detail.method.accountName };
      case "CODE_CONFIRMED":
        return check.ok && detail.codeConfirmedAt ? { ok: true, text: "Confirmed with a one-time code", value: moment(detail.codeConfirmedAt) } : { ok: false, text: "No one-time code confirmed" };
      case "HOLDS_OVER":
        return { ok: check.ok, text: check.ok ? "All refund holds are over" : "Some payments are still inside the refund hold" };
      case "NO_REFUNDS": {
        const refunded = detail.lines.filter((line) => line.reached === "REFUNDED").length;
        return check.ok ? { ok: true, text: "No refunds on these payments" } : { ok: false, text: refunded === 1 ? "{count} payment was refunded" : "{count} payments were refunded", values: { count: refunded } };
      }
      default:
        return checkLine(check, { type: detail.method.type });
    }
  });
  return [...lines.filter((line) => !line.ok), ...lines.filter((line) => line.ok)];
};

// "Khaled" from "Khaled Mahmud".
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;
