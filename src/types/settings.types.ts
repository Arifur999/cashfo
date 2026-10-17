// The settings an admin can change.
export interface IPlatformSettingsValues {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralRewardAmount: number;
}

// As the admin API answers: the values, plus who changed one last and when.
export interface IPlatformSettings extends IPlatformSettingsValues {
  lastChange?: { at: string; by: string | null } | null;
}

export type IUpdatePlatformSettingsPayload = Partial<IPlatformSettingsValues>;
