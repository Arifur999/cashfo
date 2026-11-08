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

// A cohort cell's green, in five steps so its figure stays readable (4.5:1
// or more): forest on the four pale greens, white on full emerald. `fill` is
// how much emerald is mixed into the card's white.
export interface CohortShade {
  // The lowest share (in %) that gets this shade.
  from: number;
  fill: number;
  text: "forest" | "white";
}

export const COHORT_SHADES: CohortShade[] = [
  { from: 80, fill: 100, text: "white" },
  { from: 60, fill: 55, text: "forest" },
  { from: 40, fill: 40, text: "forest" },
  { from: 20, fill: 26, text: "forest" },
  { from: 0, fill: 12, text: "forest" },
];

export const cohortShade = (percent: number): CohortShade => COHORT_SHADES.find((shade) => percent >= shade.from) ?? COHORT_SHADES[COHORT_SHADES.length - 1];
