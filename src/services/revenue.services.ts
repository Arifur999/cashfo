"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IChurnData, IRevenueOverview, IRevenueSummary } from "@/types/revenue.types";

// SUPER_ADMIN / FINANCE_ADMIN only (the API 403s every other role).
export const getRevenueSummary = async () => httpClient.get<IRevenueSummary>("/admin/revenue/summary");

export const getChurn = async () => httpClient.get<IChurnData>("/admin/revenue/churn");

export const getRevenueOverview = async () => httpClient.get<IRevenueOverview>("/admin/revenue/overview");
