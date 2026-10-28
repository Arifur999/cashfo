"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ErrorSource, IBackupRecord, IBackupStatusSummary, IErrorLog, IRateLimitLog, IRateLimitSummary, ISystemHealth } from "@/types/system.types";

// Every endpoint here is SUPER_ADMIN only on the API.

export const getBackups = async () => httpClient.get<IBackupRecord[]>("/admin/system/backups");

export const getBackupStatusSummary = async () => httpClient.get<IBackupStatusSummary>("/admin/system/backups/status-summary");

export const getErrorLogs = async (queryString: string) => httpClient.getPaginated<IErrorLog>(`/admin/system/errors?${queryString}`);

// The errors page groups what it loads: the newest `max` (the most one
// "Mark all fixed" can take), read a page at a time from the query's page.
export const getRecentErrorLogs = async (queryString: string, max = 500) => {
  const params = new URLSearchParams(queryString);
  const first = await getErrorLogs(queryString);
  const rows = [...first.data];
  const wanted = Math.min(first.meta?.total ?? rows.length, max);
  for (let page = 2; rows.length < wanted; page++) {
    params.set("page", String(page));
    const next = await getErrorLogs(params.toString());
    if (next.data.length === 0) break;
    rows.push(...next.data);
  }
  return { ...first, data: rows.slice(0, max) };
};

export const resolveErrorLog = async (id: string) => httpClient.patch<IErrorLog>(`/admin/system/errors/${id}/resolve`);

// The one write any signed-in admin may make here: the dashboard's error
// boundary logging a crash.
export const reportFrontendError = async (report: { message: string; stackTrace?: string }) =>
  httpClient.post<IErrorLog>("/admin/system/errors", { source: "ADMIN_FRONTEND", severity: "MEDIUM", ...report });

export const getRateLimitLogs = async (queryString: string) => httpClient.getPaginated<IRateLimitLog>(`/admin/system/rate-limits?${queryString}`);

export const getRateLimitSummary = async () => httpClient.get<IRateLimitSummary>("/admin/system/rate-limits/summary");

// The API's own health check: ok when it can reach the database. Timed from
// this server, so "answered in 120 ms" is the round trip the panel sees.
// Any admin may read it (the dashboard's System card).
export const getHealth = async () => {
  const started = performance.now();
  const response = await httpClient.get<{ status: "ok" | "error"; timestamp: string }>("/health");
  return { ...response, data: { ...response.data, latencyMs: Math.round(performance.now() - started) } };
};

// System > Health and backups: each service the platform leans on -- the
// API and its database (how fast), email, a payment gateway and file storage.
export const getSystemHealth = async () => httpClient.get<ISystemHealth>("/admin/system/health");

// "Mark all fixed": the errors with this message and source (or these ids).
export const resolveErrorGroup = async (payload: { message?: string; source?: ErrorSource; ids?: string[] }) =>
  httpClient.post<{ resolved: number }>("/admin/system/errors/resolve-all", payload);
