import { z } from "zod";
import { type ICreateTranslationPayload, TRANSLATION_LANGUAGES } from "@/types/translation.types";

export const TRANSLATION_TEXT_MAX_LENGTH = 1000;

// "dashboard.total_income": lowercase segments joined by dots.
export const TRANSLATION_KEY_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

const textSchema = z.string().trim().max(TRANSLATION_TEXT_MAX_LENGTH, `At most ${TRANSLATION_TEXT_MAX_LENGTH} characters`);

// A. Form schema -- a new string. The Bangla text may come later; the
// English text is what the app falls back to, so it's required.
export const translationFormZodSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Enter a key")
    .max(150, "At most 150 characters")
    .regex(TRANSLATION_KEY_PATTERN, "Lowercase words joined by dots, e.g. dashboard.total_income"),
  en: textSchema.min(1, "Enter the English text"),
  bn: textSchema,
  context: z
    .string()
    .trim()
    .max(40, "At most 40 characters")
    .refine((value) => value === "" || /^[a-z0-9_-]+$/.test(value), "One lowercase word, e.g. dashboard"),
});

export type ITranslationFormValues = z.infer<typeof translationFormZodSchema>;

// B. Server schemas.
export const translationServerZodSchema = translationFormZodSchema.transform(
  ({ context, ...values }): ICreateTranslationPayload => (context ? { ...values, context } : values),
);

// One inline edit: a single language's text.
export const translationTextServerZodSchema = z
  .object({ language: z.enum(TRANSLATION_LANGUAGES), value: textSchema })
  .refine(({ language, value }) => language !== "en" || value.length > 0, "The English text can't be empty");
