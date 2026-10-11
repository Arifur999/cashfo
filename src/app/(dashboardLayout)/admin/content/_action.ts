"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import {
  createAccountTemplate,
  deactivateAccountTemplate,
  updateAccountTemplate,
} from "@/services/accountTemplate.services";
import { accountTemplateServerZodSchema } from "@/zod/accountTemplate.validation";

// parentId makes it a sub-account of that top-level account.
export const createAccountTemplateAction = async (values: unknown, parentId?: string) =>
  runValidatedAction(accountTemplateServerZodSchema, values, "Failed to create account", (payload) =>
    createAccountTemplate(parentId ? { ...payload, parentId } : payload),
  );

export const updateAccountTemplateAction = async (templateId: string, values: unknown) =>
  requireId(templateId, "account") ??
  runValidatedAction(accountTemplateServerZodSchema, values, "Failed to update account", (payload) =>
    updateAccountTemplate(templateId, payload),
  );

export const deactivateAccountTemplateAction = async (templateId: string) =>
  requireId(templateId, "account") ?? runAction("Failed to deactivate account", () => deactivateAccountTemplate(templateId));

export const reactivateAccountTemplateAction = async (templateId: string) =>
  requireId(templateId, "account") ??
  runAction("Failed to reactivate account", () => updateAccountTemplate(templateId, { isActive: true }));
