export interface ILoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  // e.g. "invalid_password", "account_suspended", "rate_limited"
  failureReason: string | null;
  createdAt: string;
}

export interface ILoginAttemptsSummary {
  failedLast24h: number;
  failedLast7d: number;
  // Most failed attempts per IP over the last 7 days (top 5).
  topIps: { ipAddress: string; count: number }[];
  // Emails at the login throttle's limit (5 failures / 15 minutes).
  lockedOutAccounts: number;
}
