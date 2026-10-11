import { z } from "zod";
import { DATE_TIME_INPUT_PATTERN, dateTimeInputToIso } from "@/lib/date";
import {
  AUDIENCE_USER_STATUSES,
  type ICreateCampaignPayload,
  type IUpdateNotificationTemplatePayload,
  NOTIFICATION_CHANNELS,
} from "@/types/notification.types";

// Radix Select can't hold "", so "no restriction" needs values of its own.
export const ANY_PLAN = "any";
export const ANY_STATUS = "any";

const bodySchema = (language: string) =>
  z.string().trim().min(1, `Write the ${language} message`).max(5000, "At most 5,000 characters");
const subjectSchema = z.string().trim().max(200, "At most 200 characters");

// --- Templates ---

export const notificationTemplateFormZodSchema = z.object({
  subjectEn: subjectSchema,
  subjectBn: subjectSchema,
  bodyEn: bodySchema("English"),
  bodyBn: bodySchema("Bangla"),
});

export type INotificationTemplateFormValues = z.infer<typeof notificationTemplateFormZodSchema>;

// Subjects only exist for email; for other channels they're left untouched.
export const notificationTemplateServerZodSchema = notificationTemplateFormZodSchema
  .extend({ isEmail: z.boolean() })
  .transform(
    ({ isEmail, subjectEn, subjectBn, ...bodies }): IUpdateNotificationTemplatePayload =>
      isEmail ? { ...bodies, subjectEn, subjectBn } : bodies,
  );

// --- Campaigns ---

export const campaignFormZodSchema = z.object({
  title: z.string().trim().min(1, "Give the campaign a title").max(120, "At most 120 characters"),
  templateKey: z.string().min(1, "Pick a template"),
  channel: z.enum(NOTIFICATION_CHANNELS),
  planId: z.string().min(1),
  userStatus: z.string().min(1),
  scheduledFor: z
    .string()
    .refine((value) => value === "" || DATE_TIME_INPUT_PATTERN.test(value), "Pick a date and time, or leave it empty"),
});

export type ICampaignFormValues = z.infer<typeof campaignFormZodSchema>;

// Read at validation time (an event), never during render.
export const getScheduleInPastError = (scheduledFor: string, now = Date.now()) =>
  scheduledFor && DATE_TIME_INPUT_PATTERN.test(scheduledFor) && new Date(dateTimeInputToIso(scheduledFor)).getTime() <= now
    ? "Pick a time in the future"
    : undefined;

export const campaignServerZodSchema = campaignFormZodSchema
  .extend({ userStatus: z.union([z.literal(ANY_STATUS), z.enum(AUDIENCE_USER_STATUSES)]) })
  .superRefine((values, ctx) => {
    const error = getScheduleInPastError(values.scheduledFor);
    if (error) {
      ctx.addIssue({ code: "custom", path: ["scheduledFor"], message: error });
    }
  })
  .transform(
    (values): ICreateCampaignPayload => ({
      title: values.title,
      templateKey: values.templateKey,
      channel: values.channel,
      targetFilter: {
        ...(values.planId !== ANY_PLAN && { planId: values.planId }),
        ...(values.userStatus !== ANY_STATUS && { status: values.userStatus }),
      },
      ...(values.scheduledFor && { scheduledFor: dateTimeInputToIso(values.scheduledFor) }),
    }),
  );
