"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IDashboardSummary } from "@/types/dashboard.types";

export const getDashboardSummary = async () => httpClient.get<IDashboardSummary>("/admin/dashboard/summary");
