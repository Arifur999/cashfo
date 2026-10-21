import { SEVERITIES, type Severity } from "@/types/securityFlag.types";

// An error's severity chip, as the design colours them.
export const ERROR_SEVERITY_CHIP: Record<Severity, string> = {
  CRITICAL: "bg-expense text-white",
  HIGH: "bg-expense-soft text-expense",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-surface-sunken text-ink-2",
};

export const SOURCE_CHIP = "bg-surface-sunken text-ink-2";
export const CHIP = "rounded-full px-2 py-px text-caption whitespace-nowrap";

// The Severity filter's choices, most severe first as the chips are read.
// Errors and Suspicious activity both offer these, in this order.
export const SEVERITY_OPTIONS = [...SEVERITIES].reverse().map((value) => ({ value, label: `${value.charAt(0)}${value.slice(1).toLowerCase()}` }));
