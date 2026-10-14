export interface IFeatureFlag {
  id: string;
  // Stable identifier the apps check, e.g. "new_dashboard_ui".
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  // 0-100: share of eligible users who get it (gradual rollout).
  rolloutPercent: number;
  // Plans it's limited to; empty = every plan.
  targetPlanIds: string[];
  updatedAt: string;
  updatedBy: string | null;
  // What switching it changes in the app, or null for a key no code reads
  // yet (toggling it then changes nothing).
  usedFor?: string | null;
}

export interface ICreateFeatureFlagPayload {
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercent: number;
  targetPlanIds: string[];
}

export type IUpdateFeatureFlagPayload = Partial<Pick<IFeatureFlag, "isEnabled" | "rolloutPercent" | "targetPlanIds">>;
