"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAnalyticsPeriodSummary, ICohortRow, IDeviceBreakdownEntry, IEngagementMonth, IEngagementPoint, IFeatureUsageEntry, IGeography } from "@/types/analytics.types";

const BASE = "/admin/analytics";

// Every report takes the period the page shows: ?from=yyyy-MM-dd&to=yyyy-MM-dd.
export const getAnalyticsSummary = async (rangeQuery: string) => httpClient.get<IAnalyticsPeriodSummary>(`${BASE}/summary?${rangeQuery}`);
export const getFeatureUsage = async (rangeQuery: string) => httpClient.get<IFeatureUsageEntry[]>(`${BASE}/feature-usage?${rangeQuery}`);
// A row a day; with group=month (a year, or more than 62 days) a row a month.
export const getEngagement = async (rangeQuery: string) => httpClient.get<IEngagementPoint[]>(`${BASE}/engagement?${rangeQuery}`);
export const getEngagementByMonth = async (rangeQuery: string) => httpClient.get<IEngagementMonth[]>(`${BASE}/engagement?${rangeQuery}&group=month`);
// The six monthly groups up to the period's last finished month.
export const getCohorts = async (rangeQuery: string) => httpClient.get<ICohortRow[]>(`${BASE}/cohorts?${rangeQuery}`);
export const getGeography = async (rangeQuery: string) => httpClient.get<IGeography>(`${BASE}/geography?${rangeQuery}`);
export const getDevices = async (rangeQuery: string) => httpClient.get<IDeviceBreakdownEntry[]>(`${BASE}/devices?${rangeQuery}`);
