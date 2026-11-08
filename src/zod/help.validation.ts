import { z } from "zod";
import { VIDEO_CATEGORIES, WEEK_DAYS } from "@/lib/customer/helpPage";
import type { IHelpVideoPayload, IUpdateHelpCompanyPayload } from "@/types/help.types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} letters`);
const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value), "That does not look like an email address");
const optionalLink = z
  .string()
  .trim()
  .max(200)
  .refine((value) => !value || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value), "Use a web address like smartly.app/help");

const companyFields = {
  name: text(60),
  tagline: text(120),
  legalName: text(120),
  tradeLicence: text(60),
  hotline: text(30),
  whatsapp: text(30),
  email: optionalEmail,
  website: optionalLink,
  facebook: optionalLink,
  youtube: optionalLink,
  headOffice: text(200),
  dhakaOffice: text(200),
  openDays: z.array(z.enum(WEEK_DAYS)).max(7),
};

// A. Form schemas -- the values as the cards' inputs hold them.
export const helpCompanyFormZodSchema = z
  .object({
    ...companyFields,
    opensAt: z.string().regex(TIME, "Pick a time"),
    closesAt: z.string().regex(TIME, "Pick a time"),
    replyHours: z.string().trim().regex(/^\d{0,3}$/, "Whole hours, like 3"),
  })
  .refine((value) => value.opensAt < value.closesAt, { path: ["closesAt"], message: "Closing comes after opening" });
export type IHelpCompanyFormValues = z.infer<typeof helpCompanyFormZodSchema>;

export const helpVideoFormZodSchema = z.object({
  titleEn: z.string().trim().min(1, "Give the video a title").max(120),
  titleBn: text(120),
  category: z.enum(VIDEO_CATEGORIES),
  minutes: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Whole minutes, like 5")
    .refine((value) => Number(value) >= 1 && Number(value) <= 180, "Between 1 and 180 minutes"),
  youtube: z.string().trim().min(1, "Paste the YouTube link").max(300),
  shown: z.boolean(),
});
export type IHelpVideoFormValues = z.infer<typeof helpVideoFormZodSchema>;

// B. Server schemas -- re-validated in the actions, in the API's shapes.
export const updateHelpCompanyServerZodSchema = z
  .object({
    ...companyFields,
    opensAt: z.string().regex(TIME),
    closesAt: z.string().regex(TIME),
    replyHours: z.coerce.number().int().min(0).max(168),
  })
  .partial()
  .strict() satisfies z.ZodType<IUpdateHelpCompanyPayload>;

export const helpVideoServerZodSchema = z
  .object({
    titleEn: z.string().trim().min(1).max(120),
    titleBn: z.string().trim().max(120).optional(),
    category: z.enum(VIDEO_CATEGORIES),
    minutes: z.coerce.number().int().min(1).max(180),
    youtube: z.string().trim().min(1).max(300),
    shown: z.boolean().optional(),
  })
  .strict() satisfies z.ZodType<IHelpVideoPayload>;

export const updateHelpVideoServerZodSchema = helpVideoServerZodSchema.partial().extend({ id: z.uuid() }).strict();
export const helpVideoIdServerZodSchema = z.object({ id: z.uuid() }).strict();
export const orderHelpVideosServerZodSchema = z.object({ ids: z.array(z.uuid()).max(200) }).strict();
