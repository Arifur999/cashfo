import { humanizeEnum } from "@/lib/statusBadge";
import type { DeviceType } from "@/types/analytics.types";

const FEATURE_LABELS: Record<string, string> = {
  income_added: "Income added",
  expense_added: "Expense added",
  workspace_created: "Workspace created",
  account_created: "Account created",
  budget_created: "Budget created",
  login: "Login",
  report_viewed: "Report viewed",
};

// Unknown event types still read sensibly ("goal_reached" -> "Goal reached").
export const featureLabel = (eventType: string) => FEATURE_LABELS[eventType] ?? humanizeEnum(eventType.toUpperCase());

export const DEVICE_COLORS: Record<DeviceType, string> = {
  MOBILE: "var(--chart-1)",
  DESKTOP: "var(--chart-4)",
  TABLET: "var(--chart-5)",
};

// "2026-10-05" -> "Oct 5" for chart axes; no timezone involved.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatShortDay = (day: string) => {
  const [, month, date] = day.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${Number(date)}`;
};
