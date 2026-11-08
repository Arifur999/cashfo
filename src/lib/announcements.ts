import type { AnnouncementStatus, IAnnouncement } from "@/types/announcement.types";
import { formatDate } from "./date";
import { inEnglish, type Translate } from "./i18n/message";
import type { Locale } from "./i18n/translate";

// How an announcement's status reads: whether people see it right now.
export const ANNOUNCEMENT_STATUS_LABEL: Record<AnnouncementStatus, string> = {
  // In the apps and the bells now.
  ACTIVE: "Sent",
  SCHEDULED: "Scheduled",
  EXPIRED: "Ended",
  DISABLED: "Off",
};

const sameDay = (a: string, b: string) => formatDate(a, "yyyy-MM-dd") === formatDate(b, "yyyy-MM-dd");
const sameYear = (a: string, b: string) => formatDate(a, "yyyy") === formatDate(b, "yyyy");
const atMidnight = (value: string) => formatDate(value, "HH:mm") === "00:00";
const atDayEnd = (value: string) => formatDate(value, "HH:mm") === "23:59";

// "25 Sep – 9 Oct", "4 Oct, 2:00 – 3:00 am", "28 Sep, all day",
// "From 10 Oct": when a banner shows, as short as the schedule allows. With
// the locale, in the reader's months, am/pm and digits; the export leaves it out.
export const scheduleText = (announcement: Pick<IAnnouncement, "startAt" | "endAt">, t: Translate = inEnglish, locale: Locale = "en"): string => {
  const { startAt, endAt } = announcement;
  const shown = (value: string, pattern: string) => formatDate(value, pattern, "—", locale);
  if (!endAt) return t("From {date}", { date: shown(startAt, "d MMM") });
  if (sameDay(startAt, endAt)) {
    if (atMidnight(startAt) && atDayEnd(endAt)) return t("{date}, all day", { date: shown(startAt, "d MMM") });
    return `${shown(startAt, "d MMM")}, ${shown(startAt, "h:mm")} – ${shown(endAt, "h:mm aaa")}`;
  }
  const wholeDays = atMidnight(startAt) && atDayEnd(endAt);
  const start = shown(startAt, wholeDays ? "d MMM" : "d MMM, h:mm aaa");
  const end = shown(endAt, sameYear(startAt, endAt) ? (wholeDays ? "d MMM" : "d MMM, h:mm aaa") : "d MMM yyyy");
  return `${start} – ${end}`;
};

// "Everyone", or the plan's name.
export const audienceText = (targetPlan: string | null, planNames: Map<string, string>, t: Translate = inEnglish) =>
  targetPlan ? (planNames.get(targetPlan) ?? t("One plan")) : t("Everyone");
