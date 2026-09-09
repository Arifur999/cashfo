// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / payments.ts).

import axios from "axios";
import {
  API_BASE_URL,
  type AuditLogEntryRow,
  type FullAdminUser,
  type ListAuditLogsResponse,
  type ListLoginAttemptsResponse,
  type LoginAttemptsSummary,
  type SuspiciousActivityFlagRow,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getAuditLogs(queryString: string): Promise<ListAuditLogsResponse> {
  const response = await axios.get<ListAuditLogsResponse>(`${API_BASE_URL}/admin/audit-logs?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getAuditLogById(id: string): Promise<AuditLogEntryRow | null> {
  try {
    const response = await axios.get<AuditLogEntryRow>(`${API_BASE_URL}/admin/audit-logs/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getLoginAttempts(queryString: string): Promise<ListLoginAttemptsResponse> {
  const response = await axios.get<ListLoginAttemptsResponse>(`${API_BASE_URL}/admin/security/login-attempts?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getLoginAttemptsSummary(): Promise<LoginAttemptsSummary> {
  const response = await axios.get<LoginAttemptsSummary>(`${API_BASE_URL}/admin/security/login-attempts/summary`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getFlags(queryString: string): Promise<SuspiciousActivityFlagRow[]> {
  const response = await axios.get<SuspiciousActivityFlagRow[]>(`${API_BASE_URL}/admin/security/flags?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getFullAdminList(): Promise<FullAdminUser[]> {
  const response = await axios.get<FullAdminUser[]>(`${API_BASE_URL}/admin/admins`, {
    headers: await authHeaders(),
  });
  return response.data;
}
