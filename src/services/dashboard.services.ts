"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { DashboardPeriod, IDashboardOverview, IDashboardPeriodOverview } from "@/types/dashboard.types";

// The dashboard's cards in one call, over the period the page picked (the
// sign-ups chart and the new-users chip follow it). The support admin's
// dashboard reads its queue from here.
export const getDashboardSummary = async (period: DashboardPeriod = "30d") => httpClient.get<IDashboardOverview>(`/admin/dashboard/summary?period=${period}`);

// The super admin's dashboard for the days its period picker shows.
export const getDashboardOverview = async (from: string, to: string) =>
  httpClient.get<IDashboardPeriodOverview>(`/admin/dashboard/overview?${new URLSearchParams({ from, to }).toString()}`);
