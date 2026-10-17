import type { CampaignStatus, NotificationChannel, NotificationLogStatus } from "@/types/notification.types";

// How each channel reads, and the colour of its chip.
export const CHANNEL_META: Record<NotificationChannel, { label: string; chip: string; note: string }> = {
  EMAIL: { label: "Email", chip: "bg-info-soft text-info", note: "Free to send" },
  SMS: { label: "SMS", chip: "bg-warning-soft text-warning", note: "Costs per message" },
  IN_APP_PUSH: { label: "In-app", chip: "bg-pillar-habits-soft text-pillar-habits", note: "Next time they open the app" },
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

// When the platform sends each built-in template, for the templates list.
const TEMPLATE_WHEN: Record<string, string> = {
  welcome: "When someone signs up",
  subscription_expiring: "3 days before a paid plan ends",
  payment_successful: "After each successful payment",
  payment_failed: "When a payment fails",
  ticket_reply: "When support replies to a ticket",
  feature_announcement: "Sent by hand for big new features",
  promo_offer: "Made for campaigns",
};

export const templateWhen = (key: string) => TEMPLATE_WHEN[key] ?? "Sent by the platform";

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
