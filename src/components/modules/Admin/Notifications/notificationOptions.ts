import type { CampaignStatus, NotificationChannel, NotificationLogStatus } from "@/types/notification.types";

// How each channel reads, and the tone of its chip.
export const CHANNEL_META: Record<NotificationChannel, { label: string; tone: "info" | "warning" | "habits"; note: string }> = {
  EMAIL: { label: "Email", tone: "info", note: "Free to send" },
  SMS: { label: "SMS", tone: "warning", note: "Costs per message" },
  IN_APP_PUSH: { label: "In-app", tone: "habits", note: "Next time they open the app" },
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
  CANCELLED: "Cancelled",
};

export const LOG_STATUS_LABEL: Record<NotificationLogStatus, string> = {
  QUEUED: "Waiting to send",
  SENT: "Sent",
  FAILED: "Failed",
};

// What each built-in template is for, for the templates list. Campaigns
// send with their template; the system messages (welcome, payments, support
// replies) still go out in the backend's own wording, so those say so.
const TEMPLATE_WHEN: Record<string, string> = {
  welcome: "Not used yet: the built-in welcome email goes out at sign-up",
  subscription_expiring: "Not used yet: meant for 3 days before a paid plan ends",
  payment_successful: "Not used yet: meant for after each successful payment",
  payment_failed: "Not used yet: meant for when a payment fails",
  ticket_reply: "Not used yet: the built-in support-reply email and the bell go out when support replies",
  feature_announcement: "Sent by hand for big new features",
  promo_offer: "Made for campaigns",
};

// A template an admin made is for campaigns.
export const templateWhen = (key: string) => TEMPLATE_WHEN[key] ?? "Made for campaigns";

// What a preview puts in each placeholder.
export const SAMPLE_VALUES: Record<string, string> = {
  userName: "Sharmin",
  planName: "Monthly Pro",
  expiryDate: "12 Oct 2026",
  amount: "৳ 299",
  invoiceNumber: "INV-2026-000403",
  ticketSubject: "Can't export my report as PDF",
  code: "PUJA15",
  featureName: "Habits",
};
