import type { Role } from "./auth.types";
import type { FlagStatus } from "./securityFlag.types";

// The account an attempted email belongs to; null for an address nobody
// has an account with.
export interface ILoginAccount {
  name: string;
  role: Role;
  status: string;
}

export interface ILoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string | null;
  success: boolean;
  // e.g. "invalid_password", "account_suspended", "account_not_found", "rate_limited"
  failureReason: string | null;
  createdAt: string;
  // "Firefox on Linux", from the user agent.
  deviceLabel: string;
  account: ILoginAccount | null;
  // For a failure: when the same email next signed in, within a day.
  signedInAt: string | null;
}

// A network sign-in is refusing right now, and when it opens again.
export interface IPausedNetwork {
  ipAddress: string;
  email: string;
  until: string;
}

// One of the networks with the most failed sign-ins over 7 days.
export interface IFailingNetwork {
  ipAddress: string;
  count: number;
  lastAt: string | null;
  // The emails it tried, newest first (up to three), and how many in all.
  emails: string[];
  emailCount: number;
  // Whose account the newest email is.
  account: ILoginAccount | null;
  // The newest "many failed sign-ins" flag it raised, if any.
  flagStatus: FlagStatus | null;
}

export interface ILoginAttemptsSummary {
  failedLast24h: number;
  failedLast7d: number;
  // The network with the most failures in the last 24 hours.
  busiestNetworkToday: { ipAddress: string; count: number } | null;
  paused: IPausedNetwork[];
  topIps: IFailingNetwork[];
}
