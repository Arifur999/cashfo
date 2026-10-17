export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS", "IN_APP_PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_LOG_STATUSES = ["QUEUED", "SENT", "FAILED"] as const;
export type NotificationLogStatus = (typeof NOTIFICATION_LOG_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "SENT", "CANCELLED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// Who a campaign can target, by platform-user status.
export const AUDIENCE_USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_DELETION"] as const;
export type AudienceUserStatus = (typeof AUDIENCE_USER_STATUSES)[number];

export interface INotificationTemplate {
  id: string;
  // e.g. "payment_failed"; what the backend sends by.
  key: string;
  channel: NotificationChannel;
  // Emails only.
  subjectEn: string | null;
  subjectBn: string | null;
  bodyEn: string;
  bodyBn: string;
  // The {{placeholders}} this template may use, e.g. ["userName", "amount"].
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface IUpdateNotificationTemplatePayload {
  bodyEn: string;
  bodyBn: string;
  subjectEn?: string;
  subjectBn?: string;
}

export interface INotificationLog {
  id: string;
  platformUserId: string;
  templateKey: string;
  channel: NotificationChannel;
  status: NotificationLogStatus;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  platformUser: { id: string; name: string; email: string } | null;
}

// The last 24 hours of sending, and the latest failure.
export interface INotificationLogStats {
  sent: number;
  queued: number;
  failed: number;
  lastFailure: { templateKey: string; channel: NotificationChannel; errorMessage: string | null; userName: string | null } | null;
}

export interface ICampaignTargetFilter {
  planId?: string;
  status?: AudienceUserStatus;
}

export interface ICampaign {
  id: string;
  title: string;
  templateKey: string;
  targetFilter: ICampaignTargetFilter;
  channel: NotificationChannel;
  status: CampaignStatus;
  scheduledFor: string | null;
  sentCount: number;
  failedCount: number;
  // How many people the filter reaches right now.
  audienceCount: number;
  createdBy: string;
  createdAt: string;
}

export interface ICreateCampaignPayload {
  title: string;
  templateKey: string;
  channel: NotificationChannel;
  targetFilter: ICampaignTargetFilter;
  scheduledFor?: string;
}
