import type { Severity } from "./securityFlag.types";

// --- Backups ---

export const BACKUP_STATUSES = ["IN_PROGRESS", "SUCCESS", "FAILED"] as const;
export type BackupStatus = (typeof BACKUP_STATUSES)[number];

export interface IBackupRecord {
  id: string;
  // An admin id, or "SYSTEM" for scheduled runs.
  triggeredBy: string;
  type: "MANUAL" | "SCHEDULED";
  status: BackupStatus;
  sizeMb: number | null;
  fileLocation: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface IBackupStatusSummary {
  lastSuccessfulBackupAt: string | null;
  daysSinceLastBackup: number | null;
  // Over the last 30 days, finished runs only; null when there were none.
  successRate30d: number | null;
}

// --- Error logs ---

export const ERROR_SOURCES = ["BACKEND_API", "ADMIN_FRONTEND", "BACKGROUND_JOB"] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export interface IErrorLog {
  id: string;
  source: ErrorSource;
  message: string;
  stackTrace: string | null;
  severity: Severity;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// --- API rate limits ---

export interface IRateLimitLog {
  id: string;
  endpoint: string;
  windowStart: string;
  requestCount: number;
  limitExceeded: boolean;
  // "ip", "admin" or "platform_user"
  identifierType: string;
  identifier: string;
}

export interface IRateLimitSummary {
  topEndpoints: { endpoint: string; requestCount: number }[];
  exceededToday: number;
  topOffenders: { identifier: string; identifierType: string; count: number }[];
}
