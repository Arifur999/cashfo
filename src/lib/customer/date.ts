import { formatDate as formatInAppTimeZone } from "@/lib/date";
import { banglaDayMonth, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { inEnglish, plural, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// Shared date-display utility -- a compact "14 Sep 2026" style for table
// cells, distinct from DatePicker's own longer "September 14th, 2026" (too
// wide for a table row). Rendered in the platform timezone with a fixed
// format (lib/date.ts), never a bare toLocaleDateString(): that follows the
// machine -- "9/14/2026" on one, "14/09/2026" on another -- so the server
// and the browser could print different text and break hydration.
export function formatDate(value: string | Date, pattern = "d MMM yyyy"): string {
  return formatInAppTimeZone(value, pattern);
}

export function formatDateTime(value: string | Date): string {
  return formatInAppTimeZone(value, "d MMM yyyy, h:mm a");
}

// "5 minutes ago", "2 hours ago", "3 days ago", then the date: how long
// ago something last happened, as the Security board says it of a device.
// Counts and the date are in the reader's digits ("৫ মিনিট আগে").
export function formatTimeAgo(value: string | Date, t: Translate = inEnglish, locale: Locale = "en", now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60_000));
  const ago = (count: number, one: string, many: string) => plural(t, count, one, many, { count: formatCount(count, locale) });
  if (minutes < 1) return t("just now");
  if (minutes < 60) return ago(minutes, "{count} minute ago", "{count} minutes ago");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, "{count} hour ago", "{count} hours ago");
  const days = Math.floor(hours / 24);
  if (days < 30) return ago(days, "{count} day ago", "{count} days ago");
  if (locale === "bn") {
    const day = formatDate(value, "yyyy-MM-dd");
    return `${banglaDayMonth(day)} ${toBanglaDigits(day.slice(0, 4))}`;
  }
  return formatDate(value);
}

// Whole months from an ISO time to `now` (0 within the first month): how
// long ago a password was last changed.
export function monthsSince(iso: string, now: Date): number {
  const then = new Date(iso);
  const months = (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + now.getUTCMonth() - then.getUTCMonth() - (now.getUTCDate() < then.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
}

// Whole calendar months from `from` to `to`, floored -- used to auto-derive
// SavingsGoal.durationMonths from a Target End Date (see
// SavingsGoalFormModal) instead of asking the user to type a duration.
// Always at least 1: a target date that's today or in the past has no
// real "months remaining", but a suggested-monthly-contribution divisor of
// 0 or negative would be meaningless.
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(1, months);
}

// Friendly "1 year, 2 months" / "3 months" / "20 days" breakdown from
// `from` (default: now) until `to`, for a live preview next to a date
// picker -- calendar-accurate (proper carrying across month/year
// boundaries), not a rough days/30 approximation.
export function formatDurationUntil(to: Date, from: Date = new Date()): string {
  if (to <= from) return "today or already past";

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

// "17:30" -> "5:30 pm"; the am/pm word goes through `t`, and the clock is in
// the reader's digits ("৫:৩০" in Bangla).
export function timeLabel(time: string, t: Translate, locale: Locale = "en"): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${toLocaleDigits(`${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`, locale)} ${t(hours < 12 ? "am" : "pm")}`;
}
