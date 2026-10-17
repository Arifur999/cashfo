"use server";

import { requireId, runValidatedAction } from "@/lib/runAction";
import { updateNotificationTemplate } from "@/services/notification.services";
import { notificationTemplateActiveServerZodSchema, notificationTemplateServerZodSchema } from "@/zod/notification.validation";

// values: the form values plus { isEmail } (subjects only apply to email).
export const updateNotificationTemplateAction = async (templateId: string, values: unknown) =>
  requireId(templateId, "template") ??
  runValidatedAction(notificationTemplateServerZodSchema, values, "Failed to save the template", (payload) =>
    updateNotificationTemplate(templateId, payload),
  );

// values: { isActive } -- the template's On switch.
export const setNotificationTemplateActiveAction = async (templateId: string, values: unknown) =>
  requireId(templateId, "template") ??
  runValidatedAction(notificationTemplateActiveServerZodSchema, values, "Failed to switch the template", (payload) =>
    updateNotificationTemplate(templateId, payload),
  );
