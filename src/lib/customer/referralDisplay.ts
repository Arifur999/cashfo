// The sums behind Invite & earn: what has been paid out, when a pending
// reward is ready, how many friends are still waiting, the friends list's
// filters and dates, and the share links. Pure, so the page and its tests
// agree.
import { format } from "date-fns";
import type { ReferralEntry, ReferralInfo, ReferralStatus } from "./api";
import { toDateInputValue } from "@/lib/date";
import { banglaDayMonth, toBanglaDigits } from "@/lib/i18n/banglaDates";
import type { Locale } from "@/lib/i18n/translate";
import { shiftDay } from "./habitDisplay";

// A reward is confirmed once the friend has been registered this long.
export const CONFIRM_AFTER_DAYS = 30;

// Everything ever credited (totalEarned) less what is still available to
// withdraw: what has already been paid out.
export const paidOut = (info: Pick<ReferralInfo, "totalEarned" | "availableBalance">): number => Math.max(0, Number(info.totalEarned) - Number(info.availableBalance));

// The day a friend joined, on the app's calendar.
export const joinedOn = (entry: Pick<ReferralEntry, "createdAt">): string => toDateInputValue(entry.createdAt);

// The day a pending reward becomes available, on the app's calendar.
export const readyOn = (entry: Pick<ReferralEntry, "createdAt">): string => shiftDay(joinedOn(entry), CONFIRM_AFTER_DAYS);

// A "YYYY-MM-DD" day as the page writes it, in the reader's language: "14
// Aug" this year, "14 Aug 2025" in another ("১৪ আগস্ট", "১৪ আগস্ট ২০২৫").
// Built from the day's own parts, never a timezone, and `today` is the
// app's day, read once on the server, so both renders print the same.
// Anything that isn't a day comes back as it was, rather than throwing.
export function friendDay(day: string, today: string, locale: Locale): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  if (locale === "bn") return sameYear ? banglaDayMonth(day) : `${banglaDayMonth(day)} ${toBanglaDigits(year)}`;
  return format(new Date(year, month - 1, date), sameYear ? "d MMM" : "d MMM yyyy");
}

// "Sabrina Haque" -> "SH"; "bKash" -> "B".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// What the friend counts are worked out from. The API lists only the newest
// friends (recentReferrals) while referralCount counts them all; a newer
// API also says how many are pending (pendingCount), an older one doesn't.
export type FriendCounts = Pick<ReferralInfo, "referralCount" | "recentReferrals"> & { pendingCount?: number };

// Whether the list holds every friend who ever joined.
export const listsEveryFriend = (info: Pick<ReferralInfo, "referralCount" | "recentReferrals">): boolean => info.recentReferrals.length >= info.referralCount;

const listedPending = (info: FriendCounts): ReferralEntry[] => info.recentReferrals.filter((entry) => entry.status === "PENDING");

// Whether every friend still inside their 30 days is in the list. A reward
// waits exactly its friend's first 30 days and the list is newest first, so
// the pending friends are the newest ones: a cut list that isn't all pending
// still holds every one of them.
function holdsEveryPending(info: FriendCounts): boolean {
  const pending = listedPending(info).length;
  if (typeof info.pendingCount === "number") return pending >= info.pendingCount;
  return listsEveryFriend(info) || pending < info.recentReferrals.length;
}

// How many friends are still inside their 30 days, or null when the list
// can't tell (it was cut and everyone in it is pending).
export const pendingFriends = (info: FriendCounts): number | null => {
  if (typeof info.pendingCount === "number") return info.pendingCount;
  return holdsEveryPending(info) ? listedPending(info).length : null;
};

// The day the next reward becomes available (the oldest pending friend's),
// or null with nothing pending, or when that friend may be past the list.
export function nextReadyOn(info: FriendCounts): string | null {
  if (!holdsEveryPending(info)) return null;
  const days = listedPending(info).map(readyOn).sort();
  return days[0] ?? null;
}

export type ReferralFilter = "ALL" | ReferralStatus;

// "@@referral": the Savings pages word plain "Available" and "Paid out"
// their own way, and the keys are one namespace.
export const REFERRAL_FILTERS: { value: ReferralFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Available@@referral" },
  { value: "WITHDRAWN", label: "Paid out@@referral" },
];

// Label, chip tone and the note under the chip, all dictionary keys; the
// pending note takes the day it is ready ({date}). A paid-out reward is
// done, so it goes grey, apart from the green one still to withdraw.
export const STATUS_META: Record<ReferralStatus, { label: string; tone: "warning" | "income" | "neutral"; note: string }> = {
  PENDING: { label: "Pending", tone: "warning", note: "Ready on {date}" },
  CONFIRMED: { label: "Available@@referral", tone: "income", note: "Ready to withdraw" },
  WITHDRAWN: { label: "Paid out@@referral", tone: "neutral", note: "Moved to your wallet" },
};

export const filterReferrals = (entries: ReferralEntry[], filter: ReferralFilter): ReferralEntry[] => (filter === "ALL" ? entries : entries.filter((entry) => entry.status === filter));

export function filterCounts(entries: ReferralEntry[]): Record<ReferralFilter, number> {
  const counts: Record<ReferralFilter, number> = { ALL: entries.length, PENDING: 0, CONFIRMED: 0, WITHDRAWN: 0 };
  for (const entry of entries) counts[entry.status]++;
  return counts;
}

// Newest first.
export const sortReferrals = (entries: ReferralEntry[]): ReferralEntry[] => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
