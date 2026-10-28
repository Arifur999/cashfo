import { z } from "zod";
import { DATE_TIME_INPUT_PATTERN, dateTimeInputToIso } from "@/lib/date";
import {
  AUDIENCE_USER_STATUSES,
  CAMPAIGN_LANGUAGES,
  type ICreateCampaignPayload,
  type ICreateNotificationTemplatePayload,
  type IUpdateNotificationTemplatePayload,
  NOTIFICATION_CHANNELS,
} from "@/types/notification.types";

// Radix Select can't hold "", so "no restriction" needs values of its own.
export const ANY_PLAN = "any";
export const ANY_STATUS = "any";
export const ANY_LANGUAGE = "any";
export const ANY_TIME = "any";

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

// The template's On switch, on its own.
export const notificationTemplateActiveServerZodSchema = z.object({ isActive: z.boolean() }) satisfies z.ZodType<IUpdateNotificationTemplatePayload>;

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
  // "Last active within N days" ("any" = no rule) and the app language.
  lastActiveDays: z.string().refine((value) => value === ANY_TIME || /^\d{1,3}$/.test(value), "Pick how recently"),
  language: z.string().min(1),
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
  .extend({
    userStatus: z.union([z.literal(ANY_STATUS), z.enum(AUDIENCE_USER_STATUSES)]),
    language: z.union([z.literal(ANY_LANGUAGE), z.enum(CAMPAIGN_LANGUAGES)]),
  })
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
        ...(values.lastActiveDays !== ANY_TIME && { lastActiveWithinDays: Number(values.lastActiveDays) }),
        ...(values.language !== ANY_LANGUAGE && { language: values.language }),
      },
      ...(values.scheduledFor && { scheduledFor: dateTimeInputToIso(values.scheduledFor) }),
    }),
  );

// --- New template ---

// The key campaigns and the code name it by: lowercase letters, digits and
// underscores, as the API checks.
export const TEMPLATE_KEY_PATTERN = /^[a-z0-9_]{3,60}$/;

export const newTemplateFormZodSchema = z.object({
  key: z.string().trim().regex(TEMPLATE_KEY_PATTERN, "3 to 60 lowercase letters, digits or underscores"),
  channel: z.enum(NOTIFICATION_CHANNELS),
  subjectEn: subjectSchema,
  subjectBn: subjectSchema,
  bodyEn: bodySchema("English"),
  bodyBn: z.string().trim().max(5000, "At most 5,000 characters"),
});

export type INewTemplateFormValues = z.infer<typeof newTemplateFormZodSchema>;

// The {{placeholders}} both texts use, in order of first use.
export const templateVariables = (...texts: string[]) => [...new Set(texts.flatMap((text) => [...text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g)].map((match) => match[1])))];

export const newTemplateServerZodSchema = newTemplateFormZodSchema.transform(
  ({ subjectEn, subjectBn, ...values }): ICreateNotificationTemplatePayload => ({
    ...values,
    ...(values.channel === "EMAIL" && { subjectEn: subjectEn || null, subjectBn: subjectBn || null }),
    variables: templateVariables(subjectEn, subjectBn, values.bodyEn, values.bodyBn),
  }),
);
