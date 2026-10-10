export interface IPlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralRewardAmount: number;
}

export type IUpdatePlatformSettingsPayload = Partial<IPlatformSettings>;
