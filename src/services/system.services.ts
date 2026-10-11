"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IBackupRecord, IBackupStatusSummary, IErrorLog, IRateLimitLog, IRateLimitSummary } from "@/types/system.types";

// Every endpoint here is SUPER_ADMIN only on the API.

export const getBackups = async () => httpClient.get<IBackupRecord[]>("/admin/system/backups");

export const getBackupStatusSummary = async () => httpClient.get<IBackupStatusSummary>("/admin/system/backups/status-summary");

export const getErrorLogs = async (queryString: string) => httpClient.getPaginated<IErrorLog>(`/admin/system/errors?${queryString}`);

export const resolveErrorLog = async (id: string) => httpClient.patch<IErrorLog>(`/admin/system/errors/${id}/resolve`);

export const getRateLimitLogs = async (queryString: string) => httpClient.getPaginated<IRateLimitLog>(`/admin/system/rate-limits?${queryString}`);

export const getRateLimitSummary = async () => httpClient.get<IRateLimitSummary>("/admin/system/rate-limits/summary");
