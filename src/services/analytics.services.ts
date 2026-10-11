"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ICohortRow, IDeviceBreakdownEntry, IEngagementPoint, IFeatureUsageEntry, IGeography } from "@/types/analytics.types";

const BASE = "/admin/analytics";

// Range-bound reports take ?from=yyyy-MM-dd&to=yyyy-MM-dd.
export const getFeatureUsage = async (rangeQuery: string) => httpClient.get<IFeatureUsageEntry[]>(`${BASE}/feature-usage?${rangeQuery}`);

export const getEngagement = async (rangeQuery: string) => httpClient.get<IEngagementPoint[]>(`${BASE}/engagement?${rangeQuery}`);

// All-time reports.
export const getCohorts = async () => httpClient.get<ICohortRow[]>(`${BASE}/cohorts`);

export const getGeography = async () => httpClient.get<IGeography>(`${BASE}/geography`);

export const getDevices = async () => httpClient.get<IDeviceBreakdownEntry[]>(`${BASE}/devices`);
