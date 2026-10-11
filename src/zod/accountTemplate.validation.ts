import { z } from "zod";
import { ACCOUNT_TYPES, type IAccountTemplatePayload, TEMPLATE_WORKSPACE_TYPES } from "@/types/accountTemplate.types";
import { displayOrderSchema, localizedNameSchema } from "./common.validation";

// A. Form schema -- what the fields hold while the admin types.
export const accountTemplateFormZodSchema = z.object({
  name: localizedNameSchema("English"),
  nameBn: localizedNameSchema("Bangla"),
  accountType: z.enum(ACCOUNT_TYPES, "Choose an account type"),
  accountSubtype: z.string().trim().max(40, "At most 40 characters"),
  appliesTo: z.array(z.enum(TEMPLATE_WORKSPACE_TYPES)).min(1, "Pick at least one workspace type"),
  displayOrder: displayOrderSchema,
});

export type IAccountTemplateFormValues = z.infer<typeof accountTemplateFormZodSchema>;

// B. Server schema -- the API payload. The parent (for a sub-account) is
// passed to the action separately, since it isn't something the form edits.
export const accountTemplateServerZodSchema = accountTemplateFormZodSchema.transform(
  (values): IAccountTemplatePayload => ({
    name: values.name,
    nameBn: values.nameBn,
    accountType: values.accountType,
    accountSubtype: values.accountSubtype || null,
    appliesTo: values.appliesTo,
    displayOrder: Number(values.displayOrder),
  }),
);
