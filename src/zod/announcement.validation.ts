import { z } from "zod";
import { DATE_TIME_INPUT_PATTERN, dateTimeInputToIso } from "@/lib/date";
import { ANNOUNCEMENT_TYPES, type IAnnouncementPayload } from "@/types/announcement.types";

// Radix Select can't hold "", so "every plan" needs a value of its own.
export const ALL_PLANS = "all";

const optionalText = (maxLength: number) => z.string().trim().max(maxLength, `At most ${maxLength} characters`);

// A. Form schema -- start/end are datetime-local values in platform time.
export const announcementFormZodSchema = z.object({
  title: optionalText(120).min(1, "Give it a title"),
  titleBn: optionalText(120),
  body: optionalText(1000).min(1, "Write the message"),
  bodyBn: optionalText(1000),
  type: z.enum(ANNOUNCEMENT_TYPES, "Choose a type"),
  targetPlan: z.string().min(1),
  startAt: z.string().regex(DATE_TIME_INPUT_PATTERN, "Pick when it starts"),
  endAt: z.string().refine((value) => value === "" || DATE_TIME_INPUT_PATTERN.test(value), "Pick when it ends, or leave it open"),
});

export type IAnnouncementFormValues = z.infer<typeof announcementFormZodSchema>;

// Shared by the form's listen-to validator and the server schema. Values in
// one format compare correctly as strings.
export const getScheduleError = (startAt: string, endAt: string) =>
  startAt && endAt && endAt <= startAt ? "Must be after the start" : undefined;

// B. Server schema -- the API payload, times converted to UTC ISO.
export const announcementServerZodSchema = announcementFormZodSchema
  .superRefine((values, ctx) => {
    const scheduleError = getScheduleError(values.startAt, values.endAt);
    if (scheduleError) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: scheduleError });
    }
  })
  .transform(
    (values): IAnnouncementPayload => ({
      title: values.title,
      titleBn: values.titleBn || null,
      body: values.body,
      bodyBn: values.bodyBn || null,
      type: values.type,
      targetPlan: values.targetPlan === ALL_PLANS ? null : values.targetPlan,
      startAt: dateTimeInputToIso(values.startAt),
      endAt: values.endAt ? dateTimeInputToIso(values.endAt) : null,
    }),
  );
