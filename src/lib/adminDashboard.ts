// The sums behind the admin dashboard: the greeting, the change chips, the
// plan shares and the content checks. Pure, so the page and its tests agree.
import { APP_TIME_ZONE } from "./date";

export type DayPart = "morning" | "afternoon" | "evening";

// The hour (0–23) it is right now in the platform's time zone.
export function hourIn(timeZone = APP_TIME_ZONE, now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now).replace(/\D/g, "")) % 24;
}

export const dayPart = (hour: number): DayPart => (hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening");

// "Good afternoon, Nadia": the first word of the admin's name.
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;

// Percent change from one period to the next; null when there was nothing
// before, since "up from zero" is not a percentage.
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// "2026-10" → "Oct".
export function monthKeyLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export interface Share {
  name: string;
  count: number;
  // Of the whole, 0–100 with one decimal.
  pct: number;
  // A bar colour class, cycling through the design's palette.
  color: string;
}

const SHARE_COLORS = ["bg-line-strong", "bg-emerald", "bg-forest", "bg-warning-fill", "bg-info", "bg-pillar-loans"];

// Each plan's share of accounts, largest first.
export function planShares(perPlan: { planName: string; totalUsers: number }[]): Share[] {
  const total = perPlan.reduce((sum, plan) => sum + plan.totalUsers, 0);
  return [...perPlan]
    .sort((a, b) => b.totalUsers - a.totalUsers)
    .map((plan, index) => ({ name: plan.planName, count: plan.totalUsers, pct: total > 0 ? Math.round((plan.totalUsers / total) * 1000) / 10 : 0, color: SHARE_COLORS[index % SHARE_COLORS.length] }));
}

// Whole hours between a moment and now.
export const hoursSince = (iso: string, now = new Date()): number => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000));

// How many of the app's words still have no Bangla.
export function translationCoverage(list: { bn: string }[]): { total: number; missing: number; pct: number } {
  const missing = list.filter((row) => row.bn.trim() === "").length;
  return { total: list.length, missing, pct: list.length > 0 ? Math.round(((list.length - missing) / list.length) * 100) : 100 };
}

export const topRequests = <T extends { voteCount: number }>(list: T[], count = 3): T[] => [...list].sort((a, b) => b.voteCount - a.voteCount).slice(0, count);

// Announcements people can see right now.
export const liveAnnouncements = <T extends { isActive: boolean; startAt: string; endAt: string | null }>(list: T[], now = new Date()): T[] =>
  list.filter((item) => item.isActive && new Date(item.startAt) <= now && (!item.endAt || new Date(item.endAt) > now));

export const missingBangla = <T extends { contentBn: string | null }>(docs: T[]): T[] => docs.filter((doc) => !doc.contentBn || doc.contentBn.trim() === "");
