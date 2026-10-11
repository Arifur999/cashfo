import { z } from "zod";
import { CATEGORY_DIRECTIONS, type ICategoryPayload } from "@/types/category.types";
import { displayOrderSchema, localizedNameSchema } from "./common.validation";

// Radix Select can't hold "", so "not linked" needs a value of its own.
export const NO_LINKED_ACCOUNT = "none";

export const ICON_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// A. Form schema -- what the fields hold while the admin types.
export const categoryFormZodSchema = z.object({
  name: localizedNameSchema("English"),
  nameBn: localizedNameSchema("Bangla"),
  type: z.enum(CATEGORY_DIRECTIONS, "Choose income or expense"),
  icon: z
    .string()
    .trim()
    .max(40, "At most 40 characters")
    .refine((value) => value === "" || ICON_NAME_PATTERN.test(value), "Lowercase words joined by dashes, e.g. shopping-bag"),
  linkedAccountTemplateId: z.string().min(1),
  displayOrder: displayOrderSchema,
});

export type ICategoryFormValues = z.infer<typeof categoryFormZodSchema>;

// B. Server schema -- blanks become null, which also clears them on edit.
export const categoryServerZodSchema = categoryFormZodSchema.transform(
  (values): ICategoryPayload => ({
    name: values.name,
    nameBn: values.nameBn,
    type: values.type,
    icon: values.icon || null,
    linkedAccountTemplateId: values.linkedAccountTemplateId === NO_LINKED_ACCOUNT ? null : values.linkedAccountTemplateId,
    displayOrder: Number(values.displayOrder),
  }),
);
