// The Referral Program's words and sums: commission and friend statuses
// and their notes, the payout methods' names and marks, the withdrawals'
// notes, the working days a payout takes, the invite and share links.
// Pure, so the pages and the tests agree.
import { formatDay, toDateInputValue } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { CommissionKind, CommissionStatus, Earning, FriendFilter, FriendStanding, MethodSnapshot, PayoutMethodType, PayoutStatus, ReferralProgramInfo } from "./referralTypes";

// A "YYYY-MM-DD" day as the page writes it, in the reader's language: "14
// Aug" this year, "14 Aug 2025" in another ("১৪ আগস্ট", "১৪ আগস্ট ২০২৫").
// Built from the day's own parts, never a timezone, and `today` is the
// app's day, read once on the server, so both renders print the same.
// Anything that isn't a day comes back as it was, rather than throwing.
export function friendDay(day: string, today: string, locale: FormatLocale): string {
  return formatDay(day, day.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy", locale);
}

// An API time as the day it fell on, on the app's calendar; "" for none.
export const dayOf = (at: string | null | undefined): string => (at ? toDateInputValue(at) : "");

// "Sabrina Haque" -> "SH"; "bKash" -> "B".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

// --- The program's numbers ---

export function programOf(info: Pick<ReferralProgramInfo, "program">) {
  const p = info.program;
  return {
    live: p.live,
    commissionPct: p.commissionPct,
    friendDiscountPct: p.friendDiscountPct,
    holdDays: p.holdDays,
    minWithdrawal: Number(p.minWithdrawal),
    fee: Number(p.fee),
    payWithinDays: p.payWithinDays,
    methods: p.methods,
    whoCanEarn: p.whoCanEarn,
    examples: p.examples,
  };
}

export function balancesOf(info: Pick<ReferralProgramInfo, "balances">) {
  const b = info.balances;
  return {
    available: Number(b.available),
    onHold: Number(b.onHold),
    onHoldNextAt: b.onHoldNextAt,
    inWithdrawal: Number(b.inWithdrawal),
    underCheck: Number(b.underCheck),
    paidOut: Number(b.paidOut),
    reversed: Number(b.reversed),
    lifetime: Number(b.lifetime),
    lastPaidAt: b.lastPaidAt,
  };
}

// The Free-plan page shows only to a member who can't earn and has nothing
// from the program yet; one with friends or money keeps the dashboard.
export function showsLockedPage(info: ReferralProgramInfo): boolean {
  if (!info.lockedReason) return false;
  const b = balancesOf(info);
  return info.people.total === 0 && b.lifetime === 0 && b.available === 0;
}

// --- Chips ---

// A chip's look: its tone (tokens) and the dot's.
export type ChipTone = "neutral" | "warning" | "mint" | "expense" | "paid" | "info" | "check";

// --- Commission lines ---

// Label (a dictionary key) and tone.
export const COMMISSION_STATUS: Record<CommissionStatus, { label: string; tone: ChipTone }> = {
  ON_HOLD: { label: "On hold", tone: "warning" },
  AVAILABLE: { label: "Available@@referral", tone: "mint" },
  IN_WITHDRAWAL: { label: "In withdrawal", tone: "info" },
  UNDER_CHECK: { label: "Under check", tone: "check" },
  PAID_OUT: { label: "Paid out@@referral", tone: "paid" },
  REVERSED: { label: "Reversed", tone: "expense" },
  CANCELLED: { label: "Not counted", tone: "neutral" },
};

// The Earnings filter cards, in the board's order.
export const EARNING_CARDS: CommissionStatus[] = ["AVAILABLE", "ON_HOLD", "IN_WITHDRAWAL", "PAID_OUT", "REVERSED"];

// Why a line earned nothing or was taken back, under its chip.
export const CANCEL_NOTES: Record<string, string> = {
  REFERRER_NOT_ON_PAID_PLAN: "You weren't on a paid plan",
  PROGRAM_OFF: "The program was paused",
  ADMIN: "Cancelled by support",
};

// The line under a commission's chip: a dictionary key, the day it names
// ("YYYY-MM-DD") and the request it is in.
export function commissionNote(line: Pick<Earning, "status" | "availableAt" | "paidOutAt" | "endedAt" | "cancelReason" | "payout">): { note: string; day: string | null; request?: string } {
  switch (line.status) {
    case "ON_HOLD":
      return { note: "Ready {date}", day: dayOf(line.availableAt) };
    case "AVAILABLE":
      return { note: "Since {date}", day: dayOf(line.availableAt) };
    case "IN_WITHDRAWAL":
      return line.payout ? { note: "{request} · being checked", day: null, request: line.payout.displayId } : { note: "Being checked", day: null };
    case "UNDER_CHECK":
      return line.payout ? { note: "Held back from {request}", day: null, request: line.payout.displayId } : { note: "Held back for a check", day: null };
    case "PAID_OUT":
      if (line.payout && line.paidOutAt) return { note: "Paid in {request} · {date}", day: dayOf(line.paidOutAt), request: line.payout.displayId };
      return line.paidOutAt ? { note: "Paid on {date}", day: dayOf(line.paidOutAt) } : { note: "Paid out@@referral", day: null };
    case "REVERSED":
      return line.endedAt ? { note: "Refunded on {date}", day: dayOf(line.endedAt) } : { note: "Refunded", day: null };
    case "CANCELLED":
      return { note: CANCEL_NOTES[line.cancelReason ?? ""] ?? "Cancelled@@referral", day: null };
  }
}

// What a payment was ("First payment · 10% off", "Renewal"), as a key.
export const KIND_LABEL: Record<CommissionKind, string> = {
  FIRST: "First payment",
  RENEWAL: "Renewal",
  BONUS: "Sign-up bonus",
};

// --- Friends ---

export const FRIEND_STANDING: Record<FriendStanding, { label: string; tone: ChipTone }> = {
  PAYING: { label: "Paying", tone: "mint" },
  FREE: { label: "Not paying yet", tone: "neutral" },
  STOPPED: { label: "Stopped", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "expense" },
  BLOCKED: { label: "Not counted", tone: "neutral" },
};

export type FriendTab = "ALL" | Extract<FriendFilter, "PAYING" | "FREE" | "ENDED">;

export const FRIEND_TABS: { value: FriendTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PAYING", label: "Paying" },
  { value: "FREE", label: "Not paying yet" },
  { value: "ENDED", label: "Stopped or refunded" },
];

export const friendTabOf = (value: string | null | undefined): FriendTab => (FRIEND_TABS.some((tab) => tab.value === value) ? (value as FriendTab) : "ALL");

export function friendTabCounts(counts: { ALL: number } & Record<FriendStanding, number>): Record<FriendTab, number> {
  return { ALL: counts.ALL, PAYING: counts.PAYING, FREE: counts.FREE, ENDED: counts.STOPPED + counts.REFUNDED };
}

// "Imran and Tanvir signed up but haven't paid yet." as a dictionary key
// and its values.
export function notPayingLine(names: string[]): { key: string; values: Record<string, string | number> } | null {
  const first = names.map(firstName);
  if (first.length === 0) return null;
  if (first.length === 1) return { key: "{name} signed up but hasn't paid yet.", values: { name: first[0] } };
  if (first.length === 2) return { key: "{name} and {other} signed up but haven't paid yet.", values: { name: first[0], other: first[1] } };
  return { key: "{name}, {other} and {count} more signed up but haven't paid yet.", values: { name: first[0], other: first[1], count: first.length - 2 } };
}

// The four shares of "People you brought" (paying, not paying yet,
// stopped, refunded) as whole percents of the bar that add up to 100.
export function peopleMix(people: Record<"PAYING" | "FREE" | "STOPPED" | "REFUNDED", number>): { key: "PAYING" | "FREE" | "STOPPED" | "REFUNDED"; count: number; pct: number }[] {
  const keys = ["PAYING", "FREE", "STOPPED", "REFUNDED"] as const;
  const total = keys.reduce((sum, key) => sum + people[key], 0);
  if (total === 0) return keys.map((key) => ({ key, count: 0, pct: 0 }));
  return keys.map((key) => ({ key, count: people[key], pct: (people[key] / total) * 100 }));
}

// "Earnings by month": the months from the first one with money (at most
// the last `max`), so a new member's chart isn't a row of empty bars.
export function chartMonths(months: { month: string; amount: string }[], max = 6): { month: string; amount: number }[] {
  const rows = months.map((m) => ({ month: m.month, amount: Number(m.amount) }));
  const first = rows.findIndex((m) => m.amount > 0);
  const from = first < 0 ? rows.length - 1 : Math.max(first, rows.length - max);
  return rows.slice(Math.max(0, from));
}

// --- Payout methods ---

// The services' marks as the boards draw them: their own brand colours
// (palette data, the same in the dark theme, like a logo), and the
// drawer's Bank card in the app's quiet grey.
export const METHOD_BRANDS: Record<PayoutMethodType, { name: string; logo: string; color: string | null; className: string }> = {
  BKASH: { name: "bKash", logo: "bKash", color: "#E2136E", className: "text-white" },
  NAGAD: { name: "Nagad", logo: "Nagad", color: "#F37021", className: "text-white" },
  ROCKET: { name: "Rocket", logo: "Rocket", color: "#8C3494", className: "text-white" },
  BANK: { name: "Bank", logo: "BANK", color: null, className: "bg-line text-ink-2" },
};

// The quiet tile a saved bank account gets ("DBBL").
export const BANK_TILE = "bg-emerald-soft text-emerald";

const BANK_SHORT: Record<string, string> = {
  "dutch-bangla bank": "DBBL",
  "dutch bangla bank": "DBBL",
  "brac bank": "BRAC",
  "islami bank bangladesh": "IBBL",
  "islami bank": "IBBL",
  "eastern bank": "EBL",
  "city bank": "CITY",
  "the city bank": "CITY",
  "sonali bank": "SBL",
  "janata bank": "JBL",
  "agrani bank": "ABL",
  "rupali bank": "RBL",
  "prime bank": "PBL",
  "mutual trust bank": "MTB",
  "standard chartered": "SCB",
  "united commercial bank": "UCB",
  "bank asia": "BA",
  "pubali bank": "PUBALI",
};

// A bank's short mark: the one people use ("DBBL"), else its initials
// ("Midland Bank" -> "MB").
export function bankShortName(bankName: string | null | undefined): string {
  const name = (bankName ?? "").trim();
  if (!name) return "BANK";
  const known = BANK_SHORT[name.toLowerCase().replace(/\s+(plc|ltd\.?|limited)$/i, "")];
  if (known) return known;
  const letters = name
    .split(/[\s-]+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters.slice(0, 4) || name.slice(0, 4).toUpperCase();
}

// The banks the drawer offers; anything else can be typed.
export const BANKS = [
  "BRAC Bank",
  "Dutch-Bangla Bank",
  "Islami Bank Bangladesh",
  "Eastern Bank",
  "City Bank",
  "Sonali Bank",
  "Janata Bank",
  "Agrani Bank",
  "Rupali Bank",
  "Prime Bank",
  "Pubali Bank",
  "Mutual Trust Bank",
  "United Commercial Bank",
  "Bank Asia",
  "Standard Chartered",
];

// "01711482915" -> "01711-482915" (a Rocket number keeps its 12th digit).
export function formatWalletNumber(number: string | null | undefined): string {
  const digits = (number ?? "").replace(/\D/g, "");
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

// "01711-•••915", as the API masks one.
export function maskWallet(number: string | null | undefined): string {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "•••";
  return `${digits.slice(0, 5)}-•••${digits.slice(-3)}`;
}

// "•••• 4417"
export const maskAccount = (number: string | null | undefined): string => `•••• ${(number ?? "").replace(/\D/g, "").slice(-4)}`;

// Where a request went, in one line: "bKash 01711-•••915", "DBBL •••• 4417".
export function destinationLine(method: Pick<MethodSnapshot, "type" | "walletNumber" | "bankName" | "accountNumber">): string {
  if (method.type === "BANK") return `${bankShortName(method.bankName)} ${maskAccount(method.accountNumber)}`;
  return `${METHOD_BRANDS[method.type].name} ${maskWallet(method.walletNumber)}`;
}

// The mark on a method's tile: the service's, or the bank's short name.
export const methodLogo = (method: Pick<MethodSnapshot, "type" | "bankName">): string => (method.type === "BANK" ? bankShortName(method.bankName) : METHOD_BRANDS[method.type].logo);
export const methodTile = (method: Pick<MethodSnapshot, "type" | "bankName">): string => (method.type === "BANK" && method.bankName !== null ? BANK_TILE : METHOD_BRANDS[method.type].className);
export const methodColor = (method: Pick<MethodSnapshot, "type">): string | undefined => METHOD_BRANDS[method.type].color ?? undefined;

// A wallet number as typed ("+880 1711-482915") to 01XXXXXXXXX.
export function normaliseMobile(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return digits;
}

// The drawer's own check before the API's: the problem as a dictionary key,
// or null.
export function methodProblem(input: { type: PayoutMethodType; accountName: string; walletNumber: string; bankName: string; bankAccountType: string; accountNumber: string; routingNumber: string }): { field: string; message: string } | null {
  if (input.accountName.trim().length < 2) return { field: "accountName", message: "Enter the name on the account" };
  if (input.type !== "BANK") {
    const number = normaliseMobile(input.walletNumber);
    const ok = input.type === "ROCKET" ? /^01[3-9]\d{8}\d?$/.test(number) : /^01[3-9]\d{8}$/.test(number);
    if (!ok) return { field: "walletNumber", message: input.type === "ROCKET" ? "Enter the Rocket number: 11 digits starting with 01 (12 with the last digit)" : "Enter the number: 11 digits starting with 01" };
    return null;
  }
  if (input.bankName.trim().length < 2) return { field: "bankName", message: "Enter the bank name" };
  if (input.bankAccountType !== "SAVINGS" && input.bankAccountType !== "CURRENT") return { field: "bankAccountType", message: "Choose Savings or Current" };
  if (!/^\d{6,20}$/.test(input.accountNumber.replace(/[\s-]/g, ""))) return { field: "accountNumber", message: "Enter the account number (6 to 20 digits)" };
  if (!/^\d{9}$/.test(input.routingNumber.replace(/[\s-]/g, ""))) return { field: "routingNumber", message: "The routing number has 9 digits" };
  return null;
}

// "k***@gmail.com", as the API masks the address it emails.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

// --- Withdrawing ---

// The Dhaka day `days` working days after `day` (Sunday to Thursday; Friday
// and Saturday are off), as the API counts a payout's "expected by".
export function addWorkingDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  let cursor = Date.UTC(y, m - 1, d);
  let left = Math.max(0, days);
  while (left > 0) {
    cursor += 86_400_000;
    const weekday = new Date(cursor).getUTCDay();
    if (weekday !== 5 && weekday !== 6) left--;
  }
  return new Date(cursor).toISOString().slice(0, 10);
}

// How long a payout takes to each kind of account, as the board says it.
export const speedOf = (type: PayoutMethodType, payWithinDays: number): { from: number; to: number } => ({ from: type === "BANK" ? Math.min(2, payWithinDays) : 1, to: Math.max(1, payWithinDays) });

// --- Withdrawals ---

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: ChipTone }> = {
  REQUESTED: { label: "Being checked", tone: "warning" },
  APPROVED: { label: "Approved@@payout", tone: "info" },
  PAID: { label: "Paid@@payout", tone: "mint" },
  REJECTED: { label: "Rejected@@payout", tone: "expense" },
  CANCELLED: { label: "Cancelled@@referral", tone: "neutral" },
};

// --- Links ---

// The invite link, with the tag of the place it is shared (&src=facebook).
export const inviteLink = (origin: string, code: string, tag = ""): string => `${origin.replace(/\/$/, "")}/register?ref=${encodeURIComponent(code)}${tag ? `&src=${encodeURIComponent(tag)}` : ""}`;

// A new link's tag as typed: small letters and numbers only.
export const cleanTag = (raw: string): string => raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
export const isTag = (tag: string): boolean => /^[a-z0-9]{2,20}$/.test(tag);

// What the link looks like in the box: no scheme, so it reads as an address.
export const linkText = (link: string): string => link.replace(/^https?:\/\//, "");

export interface ShareLinks {
  whatsapp: string;
  // The Messenger app's own share link, for phones. Facebook's web dialog
  // for Messenger needs a registered app id, so the web gets...
  messenger: string;
  // ...Facebook's share page, which needs none (and can send in Messenger).
  facebook: string;
  email: string;
}

// `message` is the invitation in words; the link goes on the end.
export function shareLinks(link: string, message: string, subject: string): ShareLinks {
  const text = `${message} ${link}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    messenger: `fb-messenger://share/?link=${encodeURIComponent(link)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
  };
}
