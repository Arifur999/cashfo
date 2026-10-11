"use server";

import { requireId, runValidatedAction } from "@/lib/runAction";
import { updateNotificationTemplate } from "@/services/notification.services";
import { notificationTemplateServerZodSchema } from "@/zod/notification.validation";

// values: the form values plus { isEmail } (subjects only apply to email).
export const updateNotificationTemplateAction = async (templateId: string, values: unknown) =>
  requireId(templateId, "template") ??
  runValidatedAction(notificationTemplateServerZodSchema, values, "Failed to save the template", (payload) =>
    updateNotificationTemplate(templateId, payload),
  );
