"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SidebarPlan } from "@/lib/customer/billingDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const PlanContext = createContext<SidebarPlan | null>(null);

// The customer's plan as the shell shows it (the sidebar's chip and its
// Upgrade card), fed by getSidebarPlan() in the customer layout. null: not
// known (the API didn't answer), shown as the free plan.
export function PlanProvider({ value, children }: { value: SidebarPlan | null; children: ReactNode }) {
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): SidebarPlan | null {
  return useContext(PlanContext);
}

// The plan's chip as the sidebar and the Dashboard's profile card word it:
// "Free plan", "Monthly Pro", or "Monthly Pro · trial". free: show Upgrade.
export function usePlanChip(): { free: boolean; label: string } {
  const plan = usePlan();
  const { t } = useLocale();
  if (!plan?.name) return { free: true, label: t("Free plan") };
  return { free: false, label: plan.trial ? t("{plan} · trial", { plan: plan.name }) : plan.name };
}
