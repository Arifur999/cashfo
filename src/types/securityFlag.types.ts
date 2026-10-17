export const FLAG_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "FALSE_POSITIVE"] as const;
export type FlagStatus = (typeof FLAG_STATUSES)[number];

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SUSPICIOUS_ACTIVITY_TYPES = [
  "MULTIPLE_FAILED_LOGINS",
  "UNUSUAL_LOGIN_LOCATION",
  "MASS_DATA_ACCESS",
  "IMPERSONATION_SPIKE",
  "OTHER",
] as const;
export type SuspiciousActivityType = (typeof SUSPICIOUS_ACTIVITY_TYPES)[number];

export interface ISecurityFlag {
  id: string;
  type: SuspiciousActivityType;
  description: string;
  relatedAdminId: string | null;
  relatedIp: string | null;
  severity: Severity;
  status: FlagStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  relatedAdmin: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
}

// What a manual check found; it is also what "Last checked" shows next.
export interface IDetectionRunResult {
  scanned: number;
  ipsOverThreshold: number;
  flagsCreated: number;
  checkedAt: string;
}

// The count on the "Suspicious activity" tab (open or being reviewed) and
// when the last check ran.
export interface ISecurityFlagsSummary {
  needsLook: number;
  lastCheckedAt: string | null;
}
