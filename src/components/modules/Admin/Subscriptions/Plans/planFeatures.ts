import type { IFeatureLimits } from "@/types/plan.types";

type BooleanLimitKey = {
  [Key in keyof IFeatureLimits]: IFeatureLimits[Key] extends boolean ? Key : never;
}[keyof IFeatureLimits];

type NumericLimitKey = Exclude<keyof IFeatureLimits, BooleanLimitKey>;

// One list of plan features, shared by the plan form and the plan card,
// worded as the design words them.
export const PLAN_FEATURE_TOGGLES: { key: BooleanLimitKey; label: string; hint: string }[] = [
  { key: "advancedReports", label: "Advanced reports", hint: "Yearly view, category trends" },
  { key: "pdfExport", label: "PDF export", hint: "Download reports as PDF" },
  { key: "multiUser", label: "More than one user", hint: "Share a workspace with family or staff" },
  { key: "incomeGoalTracking", label: "Income goals", hint: "Set and track income targets" },
];

export const PLAN_NUMERIC_LIMITS: { key: NumericLimitKey; label: string }[] = [
  { key: "maxWorkspaces", label: "Workspaces" },
  { key: "maxBusinessWorkspaces", label: "Business workspaces" },
  { key: "maxTransactionsPerMonth", label: "Transactions a month" },
];
