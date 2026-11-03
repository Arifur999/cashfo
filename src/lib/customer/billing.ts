import "server-only";
import { cache } from "react";
import { API_BASE_URL } from "./api";
import { customerApi } from "./apiClient";
import { sidebarPlan, type BillingOverview, type SidebarPlan } from "./billingDisplay";

// The plan the shell names in the sidebar. Never fails the page: without an
// answer the sidebar shows the free plan, as it did before plans were sold.
export const getSidebarPlan = cache(async (): Promise<SidebarPlan | null> => {
  try {
    const { data } = await customerApi.get<BillingOverview>(`${API_BASE_URL}/api/billing`);
    return sidebarPlan(data.subscription, data.pendingPayment);
  } catch {
    return null;
  }
});
