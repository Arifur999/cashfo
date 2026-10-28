"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { DashboardPeriod, IDashboardOverview } from "@/types/dashboard.types";

// The dashboard's cards in one call, over the period the page picked (the
// sign-ups chart and the new-users chip follow it).
export const getDashboardSummary = async (period: DashboardPeriod = "30d") => httpClient.get<IDashboardOverview>(`/admin/dashboard/summary?period=${period}`);
