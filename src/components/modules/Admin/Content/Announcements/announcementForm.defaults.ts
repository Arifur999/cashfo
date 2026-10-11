import { toDateTimeInputValue } from "@/lib/date";
import type { IAnnouncement } from "@/types/announcement.types";
import { ALL_PLANS, type IAnnouncementFormValues } from "@/zod/announcement.validation";

// `now` is passed in (from the event that opens the dialog), so rendering
// never reads the clock.
export const getNewAnnouncementDefaults = (now: Date): IAnnouncementFormValues => ({
  title: "",
  titleBn: "",
  body: "",
  bodyBn: "",
  type: "INFO",
  targetPlan: ALL_PLANS,
  startAt: toDateTimeInputValue(now),
  endAt: "",
});

export const toAnnouncementFormValues = (announcement: IAnnouncement): IAnnouncementFormValues => ({
  title: announcement.title,
  titleBn: announcement.titleBn ?? "",
  body: announcement.body,
  bodyBn: announcement.bodyBn ?? "",
  type: announcement.type,
  targetPlan: announcement.targetPlan ?? ALL_PLANS,
  startAt: toDateTimeInputValue(announcement.startAt),
  endAt: toDateTimeInputValue(announcement.endAt),
});
