import type { CampaignStatus, NotificationChannel, NotificationLogStatus } from "@/types/notification.types";

// How each channel reads, and the tone of its chip.
export const CHANNEL_META: Record<NotificationChannel, { label: string; tone: "info" | "warning" | "habits"; note: string }> = {
  EMAIL: { label: "Email", tone: "info", note: "Free to send" },
  SMS: { label: "SMS", tone: "warning", note: "Verified phones only · costs per message" },
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
// send with their template; the automatic messages (welcome, payments,
// support replies) still go out in the backend's own wording.
const TEMPLATE_WHEN: Record<string, string> = {
  welcome: "When someone signs up",
  subscription_expiring: "3 days before a paid plan ends",
  payment_successful: "After each successful payment",
  payment_failed: "When a payment fails (an SMS; each one costs money)",
  ticket_reply: "When support replies to a ticket",
  feature_announcement: "Sent by hand for big new features",
  promo_offer: "Made for campaigns",
};

// A template an admin made is for campaigns.
export const templateWhen = (key: string) => TEMPLATE_WHEN[key] ?? "Made for campaigns";

// The built-in templates' names; an admin-made one reads from its key
// ("eid_offer" is "Eid offer").
const TEMPLATE_NAMES: Record<string, string> = {
  welcome: "Welcome",
  subscription_expiring: "Plan ending soon",
  payment_successful: "Payment received",
  payment_failed: "Payment failed",
  ticket_reply: "Support reply",
  feature_announcement: "New feature",
  promo_offer: "Offer",
};

export const templateName = (key: string): string => {
  if (TEMPLATE_NAMES[key]) return TEMPLATE_NAMES[key];
  const words = key.replace(/[_-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : key;
};

// The messages the app sends on its own when something happens. Campaigns
// can't use them. On, the template's wording goes out; off, the app's
// built-in message does (Payment failed has none: off sends nothing).
const AUTOMATIC = new Set(["welcome", "subscription_expiring", "payment_successful", "payment_failed", "ticket_reply"]);
export const isAutomaticTemplate = (key: string) => AUTOMATIC.has(key);

// What each placeholder holds, for its chip ("{{userName}}" reads "Name").
export const VARIABLE_LABELS: Record<string, string> = {
  userName: "Name",
  planName: "Plan",
  expiryDate: "End date",
  amount: "Amount",
  invoiceNumber: "Invoice number",
  ticketSubject: "Ticket subject",
  code: "Coupon code",
  featureName: "Feature name",
  currency: "Currency",
  appName: "App name",
  firstName: "First name",
  email: "Email",
};

// What a preview puts in each placeholder; the amount in the template's
// language ("Tk 299", "৳ 299").
const SAMPLE_VALUES: Record<string, string> = {
  userName: "Sharmin",
  planName: "Monthly Pro",
  expiryDate: "12 Oct 2026",
  amount: "Tk 299",
  invoiceNumber: "INV-2026-000403",
  ticketSubject: "Can't export my report as PDF",
  code: "PUJA15",
  featureName: "Habits",
  currency: "BDT",
  appName: "Smartly",
  firstName: "Sharmin",
  email: "sharmin@example.com",
};

export const sampleValues = (language: "en" | "bn"): Record<string, string> => (language === "bn" ? { ...SAMPLE_VALUES, amount: "৳ 299" } : SAMPLE_VALUES);
