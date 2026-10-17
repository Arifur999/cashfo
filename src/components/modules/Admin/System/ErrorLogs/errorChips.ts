import type { Severity } from "@/types/securityFlag.types";

// An error's severity chip, as the design colours them.
export const ERROR_SEVERITY_CHIP: Record<Severity, string> = {
  CRITICAL: "bg-expense text-white",
  HIGH: "bg-expense-soft text-expense",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-surface-sunken text-ink-2",
};

export const SOURCE_CHIP = "bg-surface-sunken text-ink-2";
export const CHIP = "rounded-full px-2 py-px text-caption whitespace-nowrap";
