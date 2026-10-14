// Feature flags the customer app reads (Admin > System > Feature Flags). The
// backend marks these keys as wired; any other flag changes nothing yet.
export type FeatureKey = "loan_management" | "dark_mode" | "pdf_export";

export type FeatureFlags = Record<string, boolean>;

// A flag that doesn't exist (never created, or unknown to an older API) is
// on: switching a feature off is something an admin does on purpose.
export const isFeatureOn = (flags: FeatureFlags, key: FeatureKey): boolean => flags[key] ?? true;
