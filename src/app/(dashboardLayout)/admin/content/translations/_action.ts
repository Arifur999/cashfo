"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createTranslation, exportTranslations, updateTranslation } from "@/services/translation.services";
import { translationServerZodSchema, translationTextServerZodSchema } from "@/zod/translation.validation";

export const createTranslationAction = async (values: unknown) =>
  runValidatedAction(translationServerZodSchema, values, "Failed to create translation", (payload) => createTranslation(payload));

// One language's text from an inline edit: { language, value }.
export const updateTranslationTextAction = async (translationId: string, values: unknown) =>
  requireId(translationId, "translation") ??
  runValidatedAction(translationTextServerZodSchema, values, "Failed to save translation", ({ language, value }) =>
    updateTranslation(translationId, { [language]: value }),
  );

export const exportTranslationsAction = async () => runAction("Failed to export translations", () => exportTranslations());
