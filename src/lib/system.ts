// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / payments.ts).

import axios from "axios";
import {
  API_BASE_URL,
  type BackupRecordRow,
  type BackupStatusSummary,
  type FeatureFlagRow,
  type ListErrorLogsResponse,
  type ListRateLimitLogsResponse,
  type RateLimitSummary,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getBackups(): Promise<BackupRecordRow[]> {
  const response = await axios.get<BackupRecordRow[]>(`${API_BASE_URL}/admin/system/backups`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getBackupStatusSummary(): Promise<BackupStatusSummary> {
  const response = await axios.get<BackupStatusSummary>(`${API_BASE_URL}/admin/system/backups/status-summary`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getFeatureFlags(): Promise<FeatureFlagRow[]> {
  const response = await axios.get<FeatureFlagRow[]>(`${API_BASE_URL}/admin/system/feature-flags`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getErrorLogs(queryString: string): Promise<ListErrorLogsResponse> {
  const response = await axios.get<ListErrorLogsResponse>(`${API_BASE_URL}/admin/system/errors?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getRateLimits(queryString: string): Promise<ListRateLimitLogsResponse> {
  const response = await axios.get<ListRateLimitLogsResponse>(`${API_BASE_URL}/admin/system/rate-limits?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getRateLimitsSummary(): Promise<RateLimitSummary> {
  const response = await axios.get<RateLimitSummary>(`${API_BASE_URL}/admin/system/rate-limits/summary`, {
    headers: await authHeaders(),
  });
  return response.data;
}
