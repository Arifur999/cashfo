"use server";

import { z } from "zod";
import { runValidatedAction, toValidationError } from "@/lib/runAction";
import { updateLegalDocument } from "@/services/legalDocument.services";
import { LEGAL_DOC_TYPES } from "@/types/legalDocument.types";
import { legalDocumentServerZodSchema } from "@/zod/legalDocument.validation";

const legalDocTypeSchema = z.enum(LEGAL_DOC_TYPES, "Unknown legal document");

// Saves the next version of one document.
export const updateLegalDocumentAction = async (type: string, values: unknown) => {
  const parsedType = legalDocTypeSchema.safeParse(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return runValidatedAction(legalDocumentServerZodSchema, values, "Failed to save the document", (payload) =>
    updateLegalDocument(parsedType.data, payload),
  );
};
