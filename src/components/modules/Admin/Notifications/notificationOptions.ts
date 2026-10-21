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

// What each built-in template is for, for the templates list. None is read
// by a sender yet: the welcome and support-reply emails and the bell go out
// with the backend's own wording, and campaigns don't send yet.
const TEMPLATE_WHEN: Record<string, string> = {
  welcome: "Not used yet: the built-in welcome email goes out at sign-up",
  subscription_expiring: "Not used yet: meant for 3 days before a paid plan ends",
  payment_successful: "Not used yet: meant for after each successful payment",
  payment_failed: "Not used yet: meant for when a payment fails",
  ticket_reply: "Not used yet: the built-in support-reply email and the bell go out when support replies",
  feature_announcement: "For campaigns, which don't send yet",
  promo_offer: "For campaigns, which don't send yet",
};

export const templateWhen = (key: string) => TEMPLATE_WHEN[key] ?? "Not used for sending yet";

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
