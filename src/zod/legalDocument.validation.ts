import { z } from "zod";
import type { IUpdateLegalDocumentPayload } from "@/types/legalDocument.types";

export const LEGAL_DOCUMENT_MAX_LENGTH = 100_000;

const contentSchema = z
  .string()
  .trim()
  .max(LEGAL_DOCUMENT_MAX_LENGTH, `At most ${LEGAL_DOCUMENT_MAX_LENGTH.toLocaleString("en-US")} characters`);

// A. Form schema.
export const legalDocumentFormZodSchema = z.object({
  contentEn: contentSchema.min(1, "The English text can't be empty"),
  contentBn: contentSchema,
});

export type ILegalDocumentFormValues = z.infer<typeof legalDocumentFormZodSchema>;

// B. Server schema -- an empty Bangla text is stored as "not translated".
export const legalDocumentServerZodSchema = legalDocumentFormZodSchema.transform(
  (values): IUpdateLegalDocumentPayload => ({ contentEn: values.contentEn, contentBn: values.contentBn || null }),
);
