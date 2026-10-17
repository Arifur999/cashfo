"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IBackupRecord, IBackupStatusSummary, IErrorLog, IRateLimitLog, IRateLimitSummary } from "@/types/system.types";

// Every endpoint here is SUPER_ADMIN only on the API.

export const getBackups = async () => httpClient.get<IBackupRecord[]>("/admin/system/backups");

export const getBackupStatusSummary = async () => httpClient.get<IBackupStatusSummary>("/admin/system/backups/status-summary");

export const getErrorLogs = async (queryString: string) => httpClient.getPaginated<IErrorLog>(`/admin/system/errors?${queryString}`);

export const resolveErrorLog = async (id: string) => httpClient.patch<IErrorLog>(`/admin/system/errors/${id}/resolve`);

// The one write any signed-in admin may make here: the dashboard's error
// boundary logging a crash.
export const reportFrontendError = async (report: { message: string; stackTrace?: string }) =>
  httpClient.post<IErrorLog>("/admin/system/errors", { source: "ADMIN_FRONTEND", severity: "MEDIUM", ...report });

export const getRateLimitLogs = async (queryString: string) => httpClient.getPaginated<IRateLimitLog>(`/admin/system/rate-limits?${queryString}`);

export const getRateLimitSummary = async () => httpClient.get<IRateLimitSummary>("/admin/system/rate-limits/summary");

// The API's own health check: ok when it can reach the database. Timed from
// this server, so "answered in 120 ms" is the round trip the panel sees.
export const getHealth = async () => {
  const started = performance.now();
  const response = await httpClient.get<{ status: "ok" | "error"; timestamp: string }>("/health");
  return { ...response, data: { ...response.data, latencyMs: Math.round(performance.now() - started) } };
};
