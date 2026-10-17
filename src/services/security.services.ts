"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import type { ILoginAttempt, ILoginAttemptsSummary } from "@/types/loginAttempt.types";
import type { FlagStatus, IDetectionRunResult, ISecurityFlag, ISecurityFlagsSummary } from "@/types/securityFlag.types";

// Every endpoint here is SUPER_ADMIN only on the API.

export const getAuditLogs = async (queryString: string) => httpClient.getPaginated<IAuditLogEntry>(`/admin/audit-logs?${queryString}`);

export const getAuditLogById = async (id: string) => httpClient.get<IAuditLogEntry>(`/admin/audit-logs/${id}`);

export const getLoginAttempts = async (queryString: string) =>
  httpClient.getPaginated<ILoginAttempt>(`/admin/security/login-attempts?${queryString}`);

export const getLoginAttemptsSummary = async () => httpClient.get<ILoginAttemptsSummary>("/admin/security/login-attempts/summary");

// Unpaginated: open flags first, newest first.
export const getSecurityFlags = async () => httpClient.get<ISecurityFlag[]>("/admin/security/flags");

// How many flags need a look, and when the last check ran.
export const getSecurityFlagsSummary = async () => httpClient.get<ISecurityFlagsSummary>("/admin/security/flags/summary");

export const updateSecurityFlagStatus = async (id: string, status: FlagStatus) =>
  httpClient.patch<ISecurityFlag>(`/admin/security/flags/${id}`, { status });

// Scans recent failed logins and raises flags for IPs over the threshold.
export const runSuspiciousActivityDetection = async () => httpClient.post<IDetectionRunResult>("/admin/security/flags/run-detection");
