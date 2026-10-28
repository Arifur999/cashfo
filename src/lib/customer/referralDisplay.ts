// The Referral Program's words and sums: friends' statuses and notes, the
// payout methods' names and marks, the withdrawals' notes, the amount
// chips, the working days a payout takes, the invite and share links.
// Pure, so the pages and the tests agree.
import { formatDay, toDateInputValue } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { FriendStatus, MethodSnapshot, PayoutMethodType, PayoutStatus, ReferralFriend, ReferralProgramInfo } from "./referralTypes";

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

// --- The program's numbers, with an older backend's fallbacks ---

// What the page needs from GET /api/referrals, whichever backend answered:
// the old one sent no program, balances or friends, so the old ৳ 100 rule's
// figures stand in.
export function programOf(info: ReferralProgramInfo) {
  return {
    live: info.program?.live ?? true,
    commissionPct: info.program?.commissionPct ?? 20,
    friendDiscountPct: info.program?.friendDiscountPct ?? 10,
    holdDays: info.program?.holdDays ?? 7,
    minWithdrawal: Number(info.program?.minWithdrawal ?? 500),
    fee: Number(info.program?.fee ?? 0),
    payWithinDays: info.program?.payWithinDays ?? 3,
    methods: info.program?.methods ?? (["BKASH", "NAGAD", "ROCKET", "BANK"] as PayoutMethodType[]),
    whoCanEarn: info.program?.whoCanEarn ?? "PAID_PLAN",
    examples: info.program?.examples ?? [],
  };
}

export function balancesOf(info: ReferralProgramInfo) {
  const b = info.balances;
  return {
    available: Number(b?.available ?? info.availableBalance),
    reserved: Number(b?.reserved ?? 0),
    pending: Number(b?.pending ?? info.pendingEarnings),
    pendingNextAt: b?.pendingNextAt ?? null,
    totalEarned: Number(b?.totalEarned ?? info.totalEarned),
    paidOut: Number(b?.paidOut ?? Math.max(0, Number(info.totalEarned) - Number(info.availableBalance))),
    lastPaidAt: b?.lastPaidAt ?? null,
  };
}

// The Free-plan page shows only to a member who can't earn and has nothing
// from the program yet; one with friends or money keeps the dashboard.
export function showsLockedPage(info: ReferralProgramInfo): boolean {
  if (!info.lockedReason) return false;
  const b = balancesOf(info);
  return info.referralCount === 0 && b.totalEarned === 0 && b.available === 0 && b.pending === 0;
}

// --- Friends ---

export type FriendTab = "ALL" | "BOUGHT" | "NOT_YET" | "REFUNDED";

export const FRIEND_TABS: { value: FriendTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BOUGHT", label: "Bought" },
  { value: "NOT_YET", label: "Not yet@@friend" },
  { value: "REFUNDED", label: "Refunded" },
];

export function friendTabCounts(info: ReferralProgramInfo, friends: ReferralFriend[]): Record<FriendTab, number> {
  const c = info.friendCounts;
  if (c) return { ALL: c.all, BOUGHT: c.bought, NOT_YET: c.notYet, REFUNDED: c.refunded };
  return {
    ALL: friends.length,
    BOUGHT: friends.filter((f) => f.filter === "BOUGHT").length,
    NOT_YET: friends.filter((f) => f.filter === "NOT_YET").length,
    REFUNDED: friends.filter((f) => f.filter === "REFUNDED").length,
  };
}

export const filterFriends = (friends: ReferralFriend[], tab: FriendTab): ReferralFriend[] => (tab === "ALL" ? friends : friends.filter((friend) => friend.filter === tab));

// A chip's look: its tone (tokens) and the dot's.
export type FriendTone = "neutral" | "warning" | "mint" | "expense" | "paid";

// Label (a dictionary key), tone, and the phone list's short label.
export const FRIEND_STATUS: Record<FriendStatus, { label: string; short: string; tone: FriendTone }> = {
  JOINED: { label: "Not bought yet", short: "Not bought", tone: "neutral" },
  PENDING: { label: "Pending", short: "Pending", tone: "warning" },
  AVAILABLE: { label: "Available@@referral", short: "Available@@referral", tone: "mint" },
  PAID_OUT: { label: "Paid out@@referral", short: "Paid out@@referral", tone: "paid" },
  CANCELLED: { label: "Cancelled@@referral", short: "Cancelled@@referral", tone: "expense" },
};

// Why a commission was cancelled, under its chip.
export const CANCEL_NOTES: Record<string, string> = {
  FRIEND_REFUNDED: "Refunded on {date}",
  REFERRER_NOT_ON_PAID_PLAN: "You weren't on a paid plan",
  PROGRAM_OFF: "The program was paused",
  SELF_REFERRAL: "Your own sign-up doesn't count",
  MONTHLY_LIMIT: "Over the monthly limit",
  ADMIN: "Cancelled by support",
};

// The line under a friend's chip: a dictionary key and the day it names
// ("YYYY-MM-DD"), or no day. The friend's current plan rides in {plan}.
export function friendNote(friend: ReferralFriend): { note: string; day: string | null; plan?: string } {
  switch (friend.status) {
    case "JOINED":
      return friend.currentPlanName ? { note: "On the {plan} plan", day: null, plan: friend.currentPlanName } : { note: "Hasn't bought a plan yet", day: null };
    case "PENDING":
      return friend.availableAt ? { note: "Ready on {date}", day: dayOf(friend.availableAt) } : { note: "In the refund window", day: null };
    case "AVAILABLE":
      return friend.availableAt ? { note: "Since {date}", day: dayOf(friend.availableAt) } : { note: "Ready to withdraw", day: null };
    case "PAID_OUT":
      return friend.paidOutAt ? { note: "Withdrawn on {date}", day: dayOf(friend.paidOutAt) } : { note: "Withdrawn", day: null };
    case "CANCELLED": {
      const reason = friend.refunded && !friend.cancelReason ? "FRIEND_REFUNDED" : (friend.cancelReason ?? "");
      const note = CANCEL_NOTES[reason] ?? "Cancelled@@referral";
      return note.includes("{date}") ? (friend.cancelledAt ? { note, day: dayOf(friend.cancelledAt) } : { note: "Refunded", day: null }) : { note, day: null };
    }
  }
}

// Friends who joined but haven't bought, oldest reminder target first.
export const notBought = (friends: ReferralFriend[]): ReferralFriend[] => friends.filter((friend) => friend.status === "JOINED");

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

// "Imran and Tanvir joined but haven't bought a plan yet." as a dictionary
// key and its values.
export function notBoughtLine(friends: ReferralFriend[]): { key: string; values: Record<string, string | number> } | null {
  const names = friends.map((friend) => firstName(friend.name));
  if (names.length === 0) return null;
  if (names.length === 1) return { key: "{name} joined but hasn't bought a plan yet.", values: { name: names[0] } };
  if (names.length === 2) return { key: "{name} and {other} joined but haven't bought a plan yet.", values: { name: names[0], other: names[1] } };
  return { key: "{name}, {other} and {count} more joined but haven't bought a plan yet.", values: { name: names[0], other: names[1], count: names.length - 2 } };
}

// What the old ৳ 100 sign-up bonuses still hold, ready to book into a wallet
// the old way.
export function legacyBonusLeft(friends: ReferralFriend[]): number {
  let paisa = 0;
  for (const friend of friends) {
    if (friend.kind !== "SIGNUP_BONUS" || friend.status !== "AVAILABLE") continue;
    paisa += Math.max(0, Math.round(Number(friend.commissionAmount ?? 0) * 100) - Math.round(Number(friend.paidOutAmount) * 100));
  }
  return paisa / 100;
}

// The day the first money was earned ("Since August"): a friend's first
// payment, or an old bonus's sign-up. null with nothing earned.
export function earningSince(friends: ReferralFriend[]): string | null {
  const days = friends.filter((f) => f.status !== "JOINED" && f.status !== "CANCELLED").map((f) => dayOf(f.boughtAt ?? f.joinedAt));
  return days.filter(Boolean).sort()[0] ?? null;
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

// The amount chips under the box: the smallest, a round thousand between
// it and everything (when there is one), and everything.
export function amountChips(available: number, minimum: number): { value: number; all: boolean }[] {
  if (available < minimum) return [];
  const chips: { value: number; all: boolean }[] = [{ value: minimum, all: false }];
  const round = Math.floor(available / 1000) * 1000;
  if (round > minimum && round < available) chips.push({ value: round, all: false });
  else if (minimum * 2 < available) chips.push({ value: minimum * 2, all: false });
  if (available > minimum) chips.push({ value: available, all: true });
  return chips;
}

// What is wrong with an amount, as a dictionary key; null when it can go.
export function amountProblem(amount: number, available: number, minimum: number, fee: number): "EMPTY" | "BELOW_MINIMUM" | "ABOVE_AVAILABLE" | "FEE_EXCEEDS_AMOUNT" | null {
  if (!Number.isFinite(amount) || amount <= 0) return "EMPTY";
  if (amount < minimum) return "BELOW_MINIMUM";
  if (amount > available) return "ABOVE_AVAILABLE";
  if (amount <= fee) return "FEE_EXCEEDS_AMOUNT";
  return null;
}

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

export type PayoutTone = "warning" | "info" | "mint" | "expense" | "neutral";

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: PayoutTone }> = {
  REQUESTED: { label: "Requested@@payout", tone: "warning" },
  APPROVED: { label: "Approved@@payout", tone: "info" },
  PAID: { label: "Paid@@payout", tone: "mint" },
  REJECTED: { label: "Rejected@@payout", tone: "expense" },
  CANCELLED: { label: "Cancelled@@referral", tone: "neutral" },
};

// --- Links ---

export const inviteLink = (origin: string, code: string): string => `${origin.replace(/\/$/, "")}/register?ref=${encodeURIComponent(code)}`;

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

// The tab the page opens on: ?tab=withdrawals (the payout emails and bell
// rows link there), else the overview.
export type ReferralTab = "overview" | "withdrawals";
export const tabFromQuery = (value: string | string[] | undefined | null): ReferralTab => (value === "withdrawals" ? "withdrawals" : "overview");
