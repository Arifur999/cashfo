"use server";

import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";
import type { NotificationSettingsPage } from "./notificationSettings";

export interface NotificationSettingsChange {
  alerts?: Record<string, Partial<Record<"app" | "email" | "sms" | "push", boolean>>>;
  loanDaysBefore?: number;
  eventDaysBefore?: number;
  quietOn?: boolean;
  quietFrom?: string;
  quietTo?: string;
  summaryMode?: "off" | "daily" | "weekly";
  summaryDay?: string;
  summaryTime?: string;
  reset?: true;
}

// Saves a change; answers the whole page again.
export async function saveNotificationSettingsAction(change: NotificationSettingsChange): Promise<CodeResult<NotificationSettingsPage>> {
  return callCodeApi(async () => (await customerApi.put<NotificationSettingsPage>("/api/notification-settings", change)).data, "Couldn't save your notification settings.");
}
