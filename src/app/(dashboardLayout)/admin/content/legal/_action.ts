"use server";

import { z } from "zod";
import { requireId, runAction, runValidatedAction, toValidationError } from "@/lib/runAction";
import { discardLegalDraft, publishLegalDraft, saveLegalDraft, updateLegalDocument } from "@/services/legalDocument.services";
import { LEGAL_DOC_TYPES } from "@/types/legalDocument.types";
import { legalDocumentServerZodSchema } from "@/zod/legalDocument.validation";

const legalDocTypeSchema = z.enum(LEGAL_DOC_TYPES, "Unknown legal document");

const parseType = (type: string) => legalDocTypeSchema.safeParse(type);

// Saves and publishes the next version of one document at once (the
// older editor's way; the board saves a draft, then publishes it).
export const updateLegalDocumentAction = async (type: string, values: unknown) => {
  const parsedType = parseType(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return runValidatedAction(legalDocumentServerZodSchema, values, "Failed to save the document", (payload) =>
    updateLegalDocument(parsedType.data, payload),
  );
};

// Save draft: the page's open draft takes this text (or one is started);
// the live page doesn't change.
export const saveLegalDraftAction = async (type: string, values: unknown) => {
  const parsedType = parseType(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return runValidatedAction(legalDocumentServerZodSchema, values, "Failed to save the draft", (payload) => saveLegalDraft(parsedType.data, payload));
};

// Publish: the draft becomes the live page as its own version.
export const publishLegalDraftAction = async (type: string, draftId: string) => {
  const parsedType = parseType(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return requireId(draftId, "draft") ?? runAction("Failed to publish the page", () => publishLegalDraft(parsedType.data, draftId));
};

// Discard: the draft goes; the live page stays as it is.
export const discardLegalDraftAction = async (type: string, draftId: string) => {
  const parsedType = parseType(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return requireId(draftId, "draft") ?? runAction("Failed to discard the draft", () => discardLegalDraft(parsedType.data, draftId));
};

// Publish with unsaved edits: the text goes into the draft, then the draft
// goes live, in one step.
export const saveAndPublishLegalAction = async (type: string, values: unknown) => {
  const parsedType = parseType(type);
  if (!parsedType.success) {
    return toValidationError(parsedType.error);
  }
  return runValidatedAction(legalDocumentServerZodSchema, values, "Failed to publish the page", async (payload) => {
    const draft = await saveLegalDraft(parsedType.data, payload);
    return publishLegalDraft(parsedType.data, draft.data.id);
  });
};
