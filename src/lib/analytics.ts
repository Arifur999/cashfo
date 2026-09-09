// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / payments.ts).

import axios from "axios";
import {
  API_BASE_URL,
  type CohortRow,
  type DeviceBreakdownEntry,
  type EngagementPoint,
  type FeatureUsageEntry,
  type GeographyResponse,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getFeatureUsage(queryString: string): Promise<FeatureUsageEntry[]> {
  const response = await axios.get<FeatureUsageEntry[]>(`${API_BASE_URL}/admin/analytics/feature-usage?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getEngagement(queryString: string): Promise<EngagementPoint[]> {
  const response = await axios.get<EngagementPoint[]>(`${API_BASE_URL}/admin/analytics/engagement?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getCohorts(): Promise<CohortRow[]> {
  const response = await axios.get<CohortRow[]>(`${API_BASE_URL}/admin/analytics/cohorts`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getGeography(): Promise<GeographyResponse> {
  const response = await axios.get<GeographyResponse>(`${API_BASE_URL}/admin/analytics/geography`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getDevices(): Promise<DeviceBreakdownEntry[]> {
  const response = await axios.get<DeviceBreakdownEntry[]>(`${API_BASE_URL}/admin/analytics/devices`, {
    headers: await authHeaders(),
  });
  return response.data;
}
