import { humanizeEnum } from "@/lib/statusBadge";
import type { DeviceType } from "@/types/analytics.types";

// What each tracked action is called on the page.
const FEATURE_LABELS: Record<string, string> = {
  expense_added: "Expenses added",
  income_added: "Income added",
  login: "Sign-ins",
  account_created: "Accounts added",
  budget_created: "Budgets made",
  workspace_created: "Workspaces made",
  report_viewed: "Reports opened",
};

// Unknown event types still read sensibly ("goal_reached" -> "Goal reached").
export const featureLabel = (eventType: string) => FEATURE_LABELS[eventType] ?? humanizeEnum(eventType.toUpperCase());

export const DEVICE_META: Record<DeviceType, { label: string; color: string }> = {
  MOBILE: { label: "Phone", color: "var(--emerald)" },
  DESKTOP: { label: "Computer", color: "var(--forest)" },
  TABLET: { label: "Tablet", color: "var(--warning-fill)" },
};

// "2026-10-05" -> "5 Oct" for chart axes; no timezone involved.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatShortDay = (day: string) => {
  const [, month, date] = day.split("-");
  return `${Number(date)} ${MONTHS[Number(month) - 1] ?? month}`;
};
