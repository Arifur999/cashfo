import { formatDate, formatMonthName, toDateInputValue } from "@/lib/date";
import type { Translate } from "@/lib/i18n/message";
import type { UserNotification } from "./api";
import { formatCurrency } from "./currency";

// The kinds of row, each with its own icon and tile colour.
export type NotificationKind = "budget" | "loan" | "savings" | "announcement";

export interface NotificationView {
  kind: NotificationKind;
  title: string;
  body: string;
  // Where a tap goes; null for an announcement, which says it all.
  href: string | null;
}

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const DAY_MS = 86_400_000;

// Whole days from today (in the app's time zone) to a 'YYYY-MM-DD' day.
function daysUntil(day: string, now: Date): number {
  const today = toDateInputValue(now);
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

function loanTitle(name: string, owed: boolean, days: number, t: Translate): string {
  if (days < 0) return t(owed ? "Payment to {name} is overdue" : "{name}'s payment to you is overdue", { name });
  if (days === 0) return t(owed ? "Payment to {name} is due today" : "{name} should pay you today", { name });
  if (days === 1) return t(owed ? "Payment to {name} is due tomorrow" : "{name} should pay you tomorrow", { name });
  return t(owed ? "Payment to {name} is due in {count} days" : "{name} should pay you in {count} days", { name, count: days });
}

// A row's words, built from its data in the reader's language. `currency`
// is the currency of the workspace it is about.
export function notificationView(item: UserNotification, t: Translate, locale: "en" | "bn", currency = "BDT", now: Date = new Date()): NotificationView {
  const data = item.data;
  const money = (value: string | number | null | undefined) => formatCurrency(Number(value ?? 0), currency);
  const monthOf = (key: string) => t(formatMonthName(key.slice(0, 7)));
  switch (item.type) {
    case "BUDGET": {
      const left = Number(data.left ?? 0);
      const category = text(data.category);
      const month = monthOf(text(data.month));
      return left < 0
        ? { kind: "budget", title: t("{category} is over its limit", { category }), body: t("{amount} over the limit for {month}.", { amount: money(-left), month }), href: "/budget-planning" }
        : { kind: "budget", title: t("{category} is at {percent}% of its limit", { category, percent: text(data.percent) }), body: t("Only {amount} left for the rest of {month}.", { amount: money(left), month }), href: "/budget-planning" };
    }
    case "LOAN_DUE": {
      const due = text(data.dueDate);
      const contact = encodeURIComponent(text(data.contactId));
      return {
        kind: "loan",
        title: loanTitle(text(data.name), data.direction === "PAYABLE", daysUntil(due, now), t),
        body: t("{amount} on {date}.", { amount: money(data.amount), date: formatDate(`${due}T00:00:00Z`, "EEE, d MMM") }),
        href: Number(data.loan) === 1 ? `/loan-management/ledger?contactId=${contact}` : `/contacts/${contact}`,
      };
    }
    case "SAVINGS": {
      const goal = text(data.goal);
      return {
        kind: "savings",
        title: t("Savings check-in for {month}", { month: monthOf(text(data.month)) }),
        body:
          Number(data.behind) === 1
            ? t("{goal} is behind. Save {amount} a month to reach it by {month}.", { goal, amount: money(data.perMonth), month: monthOf(text(data.targetDate)) })
            : t("{goal} is on track: {percent}% saved.", { goal, percent: text(data.percent) }),
        href: "/savings-goals/dashboard",
      };
    }
    case "ANNOUNCEMENT": {
      const bangla = locale === "bn";
      return {
        kind: "announcement",
        title: text(bangla && text(data.titleBn).trim() ? data.titleBn : data.title),
        body: text(bangla && text(data.bodyBn).trim() ? data.bodyBn : data.body),
        href: null,
      };
    }
  }
}

// "12 min ago" within the hour, "11:20 am" later today, "Yesterday", then
// "Thu, 1 Oct" (or "2 Jun 2025" from another year), as the board dates them.
export function notificationTime(iso: string, t: Translate, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("just now");
  if (minutes < 60) return t("{count} min ago", { count: minutes });
  const day = toDateInputValue(iso);
  const today = toDateInputValue(now);
  if (day === today) return formatDate(iso, "h:mm aaa");
  if (day === toDateInputValue(new Date(now.getTime() - DAY_MS))) return t("Yesterday");
  return formatDate(iso, day.slice(0, 4) === today.slice(0, 4) ? "EEE, d MMM" : "d MMM yyyy");
}
