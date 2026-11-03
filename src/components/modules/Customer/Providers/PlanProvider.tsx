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

export type PlanStatus = "free" | "trial" | "paid";

export interface PlanChip {
  status: PlanStatus;
  // Shorthand for status === "free": show Upgrade.
  free: boolean;
  // A payment waits for an admin to confirm it.
  pending: boolean;
  // When the trial ends; null outside one.
  trialEndsAt: string | null;
  // "Free plan", "Free trial", or the plan's name.
  label: string;
}

// The plan as the sidebar's chip and card and the Dashboard's profile card
// word it (AppSidebar and Dashboard boards).
export function usePlanChip(): PlanChip {
  const plan = usePlan();
  const { t } = useLocale();
  const pending = !!plan?.pending;
  if (!plan?.name) return { status: "free", free: true, pending, trialEndsAt: null, label: t("Free plan") };
  if (plan.trial) return { status: "trial", free: false, pending, trialEndsAt: plan.trialEndsAt, label: t("Free trial") };
  return { status: "paid", free: false, pending, trialEndsAt: null, label: plan.name };
}
