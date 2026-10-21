import type { IFeatureLimits } from "@/types/plan.types";

type BooleanLimitKey = {
  [Key in keyof IFeatureLimits]: IFeatureLimits[Key] extends boolean ? Key : never;
}[keyof IFeatureLimits];

type NumericLimitKey = Exclude<keyof IFeatureLimits, BooleanLimitKey>;

// The plan every new account starts on. The API keeps its slug "free" and
// refuses to delete it.
export const FREE_PLAN_SLUG = "free";

// One list of plan features, shared by the plan form and the plan card,
// worded as the design words them.
export const PLAN_FEATURE_TOGGLES: { key: BooleanLimitKey; label: string; hint: string }[] = [
  { key: "advancedReports", label: "Advanced reports", hint: "Yearly view, category trends" },
  { key: "pdfExport", label: "PDF export", hint: "Download reports as PDF" },
  { key: "multiUser", label: "More than one user", hint: "Share a workspace with family or staff" },
  { key: "incomeGoalTracking", label: "Income goals", hint: "Set and track income targets" },
];

// `restore` is the number unticking "No limit" puts back when the limit
// had none before: a usable start, never 0.
export const PLAN_NUMERIC_LIMITS: { key: NumericLimitKey; label: string; restore: string }[] = [
  { key: "maxWorkspaces", label: "Workspaces", restore: "1" },
  { key: "maxBusinessWorkspaces", label: "Business workspaces", restore: "1" },
  { key: "maxTransactionsPerMonth", label: "Transactions a month", restore: "50" },
];
