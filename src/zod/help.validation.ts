import { z } from "zod";
import { VIDEO_CATEGORIES, WEEK_DAYS, youtubeIdOf } from "@/lib/customer/helpPage";
import type { IHelpVideoPayload, IUpdateHelpCompanyPayload } from "@/types/help.types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// The board's rules: a phone of 7 to 19 digits, spaces and dashes, maybe a +;
// a link that starts with http(s)://.
const PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;
const LINK = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} letters`);
const needed = (max: number, message: string) => text(max).min(1, message);
const phone = (message: string) => text(30).regex(PHONE, message);
const link = (max: number, optional: boolean) => text(max).refine((value) => (optional && !value) || LINK.test(value), "Start the link with https://");

// A. Form schemas -- the values as the cards' inputs hold them, with the
// board's checks: the card's main lines are needed, the rest may stay empty.
export const helpCompanyFormZodSchema = z
  .object({
    name: needed(40, "Type the brand name."),
    legalName: needed(80, "Type the legal company name."),
    tagline: needed(90, "Type a short tagline."),
    taglineBn: text(90),
    tradeLicence: text(40),
    website: link(200, false),
    hotline: phone("Type a phone number, like +880 9612-345678."),
    whatsapp: phone("Type a WhatsApp number, like +880 1711-234567."),
    email: text(120).regex(EMAIL, "Type a full email address."),
    facebook: link(200, true),
    youtube: link(200, true),
    headOffice: needed(140, "Type the head office address."),
    dhakaOffice: text(140),
    openDays: z.array(z.enum(WEEK_DAYS)).min(1, "Pick at least one office day.").max(7),
    opensAt: z.string().regex(TIME, "Pick a time"),
    closesAt: z.string().regex(TIME, "Pick a time"),
    replyHours: z
      .string()
      .trim()
      .refine((value) => /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 72, "Type whole hours between 1 and 72."),
  })
  .refine((value) => value.opensAt < value.closesAt, { path: ["closesAt"], message: "The closing time must be after the opening time." });
export type IHelpCompanyFormValues = z.infer<typeof helpCompanyFormZodSchema>;

export const helpVideoFormZodSchema = z.object({
  titleEn: z.string().trim().min(1, "Type a title in English.").max(120, "Keep it under 120 letters"),
  titleBn: text(120),
  category: z.enum(VIDEO_CATEGORIES),
  minutes: z
    .string()
    .trim()
    .refine((value) => /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 120, "Whole minutes, 1 to 120."),
  youtube: z
    .string()
    .trim()
    .min(1, "Paste the YouTube link.")
    .max(300)
    .refine((value) => youtubeIdOf(value) !== null, "This is not a YouTube video link. Use a youtube.com/watch?v=, youtu.be, shorts or embed link."),
  shown: z.boolean(),
});
export type IHelpVideoFormValues = z.infer<typeof helpVideoFormZodSchema>;

// B. Server schemas -- re-validated in the actions, in the API's shapes.
export const updateHelpCompanyServerZodSchema = z
  .object({
    name: text(60),
    tagline: text(120),
    taglineBn: text(120),
    legalName: text(120),
    tradeLicence: text(60),
    hotline: text(30),
    whatsapp: text(30),
    email: text(120).regex(EMAIL),
    website: text(200),
    facebook: text(200),
    youtube: text(200),
    headOffice: text(200),
    dhakaOffice: text(200),
    openDays: z.array(z.enum(WEEK_DAYS)).max(7),
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
