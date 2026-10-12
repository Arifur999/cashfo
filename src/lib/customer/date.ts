import { formatDate as formatInAppTimeZone } from "@/lib/date";

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
