// The settings an admin can change on Settings, System and Security.
export interface IPlatformSettingsValues {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultTimezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  // The maintenance notice for customers using the app in Bangla.
  maintenanceMessageBn: string;
  // Off refuses new customer accounts; people with one still sign in.
  signupsOpen: boolean;
  // Every admin must use two-step sign-in (Security > Admin team).
  adminTwoStepRequired: boolean;
  // The old flat referral reward. Referrals & Payouts > Settings holds the
  // commission rules now; the API still answers with it.
  referralRewardAmount: number;
  // Where a customer sends the money for a plan (Checkout): wallet numbers
  // as digits, empty when that way isn't offered. Absent from an older API.
  billingPaymentAccounts?: IPaymentAccounts;
}

export interface IPaymentAccounts {
  bkash: string;
  nagad: string;
  rocket: string;
  bank: { bankName: string; branch: string; accountName: string; accountNumber: string; routingNumber: string };
}

// As the admin API answers: the values, plus who changed one last and when.
export interface IPlatformSettings extends IPlatformSettingsValues {
  lastChange?: { at: string; by: string | null } | null;
}

export type IUpdatePlatformSettingsPayload = Partial<Omit<IPlatformSettingsValues, "referralRewardAmount">>;
