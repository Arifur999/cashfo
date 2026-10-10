import type { IFeatureLimits } from "@/types/plan.types";

type BooleanLimitKey = {
  [Key in keyof IFeatureLimits]: IFeatureLimits[Key] extends boolean ? Key : never;
}[keyof IFeatureLimits];

type NumericLimitKey = Exclude<keyof IFeatureLimits, BooleanLimitKey>;

// One list of plan features, shared by the plan form and the plan card.
export const PLAN_FEATURE_TOGGLES: { key: BooleanLimitKey; label: string }[] = [
  { key: "advancedReports", label: "Advanced reports" },
  { key: "pdfExport", label: "PDF export" },
  { key: "multiUser", label: "Multi-user" },
  { key: "incomeGoalTracking", label: "Income goal tracking" },
];

export const PLAN_NUMERIC_LIMITS: { key: NumericLimitKey; label: string; hint?: string }[] = [
  { key: "maxWorkspaces", label: "Workspaces" },
  { key: "maxBusinessWorkspaces", label: "Business workspaces", hint: "-1 = unlimited" },
  { key: "maxTransactionsPerMonth", label: "Transactions / month", hint: "-1 = unlimited" },
];

export const formatLimit = (value: number) => (value === -1 ? "Unlimited" : String(value));
