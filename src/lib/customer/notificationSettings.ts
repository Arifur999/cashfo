// Settings › Notifications as the API sends it (GET /api/notification-settings).
// Server-only reader; the page saves through notificationSettingsActions.ts.
import "server-only";
import { customerApi } from "./apiClient";
import { emptyUnlessOutage } from "./readFallback";

export type NotifyChannel = "app" | "email" | "sms" | "push";

export interface NotificationPrefs {
  alerts: Record<string, Record<NotifyChannel, boolean>>;
  loanDaysBefore: number;
  eventDaysBefore: number;
  quiet: { on: boolean; from: string; to: string };
  summary: { mode: "off" | "daily" | "weekly"; day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"; time: string };
}

export interface NotificationSettingsPage {
  prefs: NotificationPrefs;
  on: number;
  total: number;
  // SMS alerts are Pro's.
  pro: boolean;
  // Channels that stay on for an alert (security: the bell and email).
  locked: Record<string, NotifyChannel[]>;
  destinations: { email: string; phone: string | null; devices: string[] };
}

// null when it can't be read (an older backend answers 404).
export async function getNotificationSettings(): Promise<NotificationSettingsPage | null> {
  try {
    return (await customerApi.get<NotificationSettingsPage>("/api/notification-settings")).data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
}
