// The figures over the Analytics page (distinct customers with a session
// made or used in each window).
export interface IAnalyticsSummary {
  activeLast30d: number;
  activeLast7d: number;
  activePrevious7d: number;
  activeYesterday: number;
  totalAccounts: number;
}

export interface IFeatureUsageEntry {
  // "income_added", "login", ...
  eventType: string;
  count: number;
}

export interface IEngagementPoint {
  // yyyy-MM-dd
  date: string;
  dau: number;
  // Distinct users over the trailing 7 days.
  wau: number;
}

export interface ICohortRow {
  // yyyy-MM
  cohortMonth: string;
  cohortSize: number;
  // % of the cohort active N months after signing up; null = not reached yet.
  monthsSinceSignup: (number | null)[];
}

export interface IGeography {
  countries: { country: string; eventCount: number; userCount: number }[];
  cities: { city: string; country: string; eventCount: number; userCount: number }[];
}

export const DEVICE_TYPES = ["MOBILE", "DESKTOP", "TABLET"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface IDeviceBreakdownEntry {
  deviceType: DeviceType;
  count: number;
  percentage: number;
}
