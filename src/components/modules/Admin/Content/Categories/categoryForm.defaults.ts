import type { ICategory } from "@/types/category.types";
import { type ICategoryFormValues, NO_LINKED_ACCOUNT } from "@/zod/category.validation";

export const NEW_CATEGORY_DEFAULTS: ICategoryFormValues = {
  name: "",
  nameBn: "",
  type: "EXPENSE",
  icon: "",
  linkedAccountTemplateId: NO_LINKED_ACCOUNT,
  displayOrder: "0",
};

export const toCategoryFormValues = (category: ICategory): ICategoryFormValues => ({
  name: category.name,
  nameBn: category.nameBn,
  type: category.type,
  icon: category.icon ?? "",
  linkedAccountTemplateId: category.linkedAccountTemplateId ?? NO_LINKED_ACCOUNT,
  displayOrder: String(category.displayOrder),
});
