export const ANNOUNCEMENT_TYPES = ["INFO", "WARNING", "PROMOTION", "MAINTENANCE"] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = ["ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export interface IAnnouncement {
  id: string;
  title: string;
  titleBn: string | null;
  body: string;
  bodyBn: string | null;
  type: AnnouncementType;
  // A subscription plan id; null shows it to every user.
  targetPlan: string | null;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  // Worked out by the API from isActive and the schedule.
  status: AnnouncementStatus;
}

export interface IAnnouncementPayload {
  title: string;
  body: string;
  type: AnnouncementType;
  startAt: string;
  // null clears these (no Bangla copy, every plan, no end).
  titleBn: string | null;
  bodyBn: string | null;
  targetPlan: string | null;
  endAt: string | null;
}
