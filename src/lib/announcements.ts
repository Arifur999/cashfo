import type { AnnouncementStatus, IAnnouncement } from "@/types/announcement.types";
import { formatDate } from "./date";

// How an announcement's status reads: whether people see it right now.
export const ANNOUNCEMENT_STATUS_LABEL: Record<AnnouncementStatus, string> = {
  ACTIVE: "Live",
  SCHEDULED: "Scheduled",
  EXPIRED: "Ended",
  DISABLED: "Off",
};

const sameDay = (a: string, b: string) => formatDate(a, "yyyy-MM-dd") === formatDate(b, "yyyy-MM-dd");
const sameYear = (a: string, b: string) => formatDate(a, "yyyy") === formatDate(b, "yyyy");
const atMidnight = (value: string) => formatDate(value, "HH:mm") === "00:00";
const atDayEnd = (value: string) => formatDate(value, "HH:mm") === "23:59";

// "25 Sep – 9 Oct", "4 Oct, 2:00 – 3:00 am", "28 Sep, all day",
// "From 10 Oct": when a banner shows, as short as the schedule allows.
export const scheduleText = (announcement: Pick<IAnnouncement, "startAt" | "endAt">): string => {
  const { startAt, endAt } = announcement;
  if (!endAt) return `From ${formatDate(startAt, "d MMM")}`;
  if (sameDay(startAt, endAt)) {
    if (atMidnight(startAt) && atDayEnd(endAt)) return `${formatDate(startAt, "d MMM")}, all day`;
    return `${formatDate(startAt, "d MMM")}, ${formatDate(startAt, "h:mm")} – ${formatDate(endAt, "h:mm aaa")}`;
  }
  const wholeDays = atMidnight(startAt) && atDayEnd(endAt);
  const start = formatDate(startAt, wholeDays ? "d MMM" : "d MMM, h:mm aaa");
  const end = formatDate(endAt, sameYear(startAt, endAt) ? (wholeDays ? "d MMM" : "d MMM, h:mm aaa") : "d MMM yyyy");
  return `${start} – ${end}`;
};

// "Everyone", or the plan's name.
export const audienceText = (targetPlan: string | null, planNames: Map<string, string>) =>
  targetPlan ? (planNames.get(targetPlan) ?? "One plan") : "Everyone";
