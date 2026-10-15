// The sums behind Invite & earn: what has been paid out, when a pending
// reward is ready, the friends list's filters, and the share links. Pure,
// so the page and its tests agree.
import type { ReferralEntry, ReferralInfo, ReferralStatus } from "./api";
import { toDateInputValue } from "@/lib/date";
import { shiftDay } from "./habitDisplay";

// A reward is confirmed once the friend has been registered this long.
export const CONFIRM_AFTER_DAYS = 30;

// Everything ever credited (totalEarned) less what is still available to
// withdraw: what has already been paid out.
export const paidOut = (info: Pick<ReferralInfo, "totalEarned" | "availableBalance">): number => Math.max(0, Number(info.totalEarned) - Number(info.availableBalance));

// The day a pending reward becomes available, on the app's calendar.
export const readyOn = (entry: Pick<ReferralEntry, "createdAt">): string => shiftDay(toDateInputValue(entry.createdAt), CONFIRM_AFTER_DAYS);

// "Sabrina Haque" -> "SH"; "bKash" -> "B".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export type ReferralFilter = "ALL" | ReferralStatus;

export const REFERRAL_FILTERS: { value: ReferralFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Available" },
  { value: "WITHDRAWN", label: "Paid out" },
];

// Label, chip tone and the note under the chip, all dictionary keys.
export const STATUS_META: Record<ReferralStatus, { label: string; tone: "warning" | "income" | "mint"; note: string }> = {
  PENDING: { label: "Pending", tone: "warning", note: "Ready on" },
  CONFIRMED: { label: "Available", tone: "income", note: "Counts in your balance" },
  WITHDRAWN: { label: "Paid out", tone: "mint", note: "Withdrawn" },
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
  messenger: string;
  email: string;
}

// `message` is the invitation in words; the link goes on the end.
export function shareLinks(link: string, message: string, subject: string): ShareLinks {
  const text = `${message} ${link}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(link)}&app_id=0&redirect_uri=${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
  };
}
