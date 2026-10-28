import { METHOD_BRANDS, bankShortName, formatWalletNumber, maskAccount } from "@/lib/customer/referralDisplay";
import type { BadgeTone } from "@/lib/statusBadge";
import type { IPayoutCheck, IPayoutDetail, IPayoutMethodSnapshot, IPayoutRow, PayoutCheckKey, PayoutStatus, ReferralStatus } from "@/types/referral.types";

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

export type RowAction = "approve" | "reject" | "review" | "pay" | "view";

// What the Action column offers. Those who can only look get View.
export const rowActions = (row: Pick<IPayoutRow, "status" | "checks">, canManage: boolean): RowAction[] => {
  if (!canManage) return ["view"];
  if (row.status === "REQUESTED") return hasWarnings(row) ? ["review", "reject"] : ["approve", "reject"];
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

// --- Every referral ---

export const REFERRAL_STATUS_CHIP: Record<ReferralStatus, { label: string; tone: BadgeTone }> = {
  JOINED: { label: "Joined@@referral", tone: "neutral" },
  PENDING: { label: "Pending@@referral", tone: "warning" },
  AVAILABLE: { label: "Available@@referral", tone: "success" },
  PAID_OUT: { label: "Paid out@@referral", tone: "info" },
  CANCELLED: { label: "Cancelled@@referral", tone: "danger" },
};

// Why a commission was cancelled, in words.
export const CANCEL_REASON_TEXT: Record<string, string> = {
  FRIEND_REFUNDED: "The friend was refunded",
  ADMIN: "Cancelled by an admin",
};

// Only a commission that is waiting or ready, with nothing paid out of it,
// can be cancelled (the API refuses the rest).
export const canCancelReferral = (row: { status: ReferralStatus; paidOutAmount: string | null }): boolean =>
  (row.status === "PENDING" || row.status === "AVAILABLE") && !(Number(row.paidOutAmount ?? 0) > 0);

// --- The settings' worked example ---

// The friend's discount is whole taka, rounded down; the commission is a
// share of what the friend paid, rounded down to whole taka -- as the API
// works them out.
export const referralExample = (price: number, friendDiscountPct: number, commissionPct: number) => {
  const pricePaisa = Math.round(price * 100);
  const discountPaisa = friendDiscountPct > 0 ? Math.min(Math.floor((pricePaisa * friendDiscountPct) / 100 / 100) * 100, pricePaisa) : 0;
  const friendPaysPaisa = pricePaisa - discountPaisa;
  const commission = commissionPct > 0 ? Math.floor((friendPaysPaisa * Math.round(commissionPct * 100)) / 1_000_000) : 0;
  const friendPays = friendPaysPaisa / 100;
  return { price, friendPays, commission, youKeep: friendPays - commission };
};

// --- "Why this member is owed this" ---

export interface OwedLine {
  ok: boolean;
  // A dictionary key and its values; `value` is the figure on the right.
  text: string;
  values?: Record<string, string | number>;
  value?: string;
}

interface OwedFormat {
  money: (amount: number) => string;
  moment: (iso: string) => string;
  count: (value: number) => string;
}

// The commissions behind a request, grouped by plan ("4 friends bought
// Yearly Pro", 4 × ৳ 540), then whether they are all past the refund window
// and none refunded, then the account's checks: what the admin needs to be
// sure before sending.
export const owedLines = (
  detail: Pick<IPayoutDetail, "owedBecause" | "checks" | "method" | "amount" | "codeConfirmedAt">,
  holdDays: number | null,
  format: OwedFormat,
): OwedLine[] => {
  const lines: OwedLine[] = [];
  const groups = new Map<string, IPayoutDetail["owedBecause"]>();
  for (const part of detail.owedBecause) {
    const key = part.kind === "SIGNUP_BONUS" ? "SIGNUP_BONUS" : `PLAN:${part.planName ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), part]);
  }
  for (const [key, parts] of groups) {
    const amounts = parts.map((part) => Number(part.amount));
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const same = amounts.every((amount) => amount === amounts[0]);
    const value = parts.length > 1 && same ? `${format.count(parts.length)} × ${format.money(amounts[0])}` : format.money(total);
    if (key === "SIGNUP_BONUS") {
      lines.push({ ok: true, text: parts.length === 1 ? "{count} sign-up bonus" : "{count} sign-up bonuses", values: { count: format.count(parts.length) }, value });
    } else {
      const plan = key.slice(5);
      lines.push({
        ok: true,
        text: plan ? (parts.length === 1 ? "{count} friend bought {plan}" : "{count} friends bought {plan}") : parts.length === 1 ? "{count} friend bought a plan" : "{count} friends bought a plan",
        values: { count: format.count(parts.length), plan },
        value,
      });
    }
  }
  const parts = detail.owedBecause;
  if (parts.length > 0) {
    const inside = parts.filter((part) => !part.pastWindow).length;
    const refunded = parts.filter((part) => part.refunded).length;
    const total = format.money(parts.reduce((sum, part) => sum + Number(part.amount), 0));
    if (inside === 0 && refunded === 0) {
      lines.push(
        holdDays === null
          ? { ok: true, text: "All past the refund window, none refunded", value: total }
          : { ok: true, text: "All past the {days}-day window, none refunded", values: { days: format.count(holdDays) }, value: total },
      );
    }
    if (inside > 0) lines.push({ ok: false, text: "{count} still inside the refund window", values: { count: format.count(inside) } });
    if (refunded > 0) lines.push({ ok: false, text: refunded === 1 ? "{count} friend was refunded" : "{count} friends were refunded", values: { count: format.count(refunded) } });
  }
  const method = methodName(detail.method);
  for (const check of detail.checks) {
    if (check.key === "NAME_MATCHES") {
      lines.push({ ok: check.ok, text: check.ok ? "Name on {method} matches the account" : "Name on {method} doesn't match the account", values: { method }, value: detail.method.accountName });
    } else if (check.key === "CODE_CONFIRMED") {
      lines.push(check.ok && detail.codeConfirmedAt ? { ok: true, text: "Confirmed with a one-time code", value: format.moment(detail.codeConfirmedAt) } : { ok: false, text: "No one-time code confirmed" });
    } else if (!check.ok && check.key !== "NO_REFUNDS") {
      lines.push(checkLine(check, detail.method));
    }
  }
  return lines;
};

// "Khaled" from "Khaled Mahmud", for "Why Khaled is owed this".
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;
