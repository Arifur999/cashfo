"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createCategory, updateCategory } from "@/services/category.services";
import { categoryServerZodSchema } from "@/zod/category.validation";

export const createCategoryAction = async (values: unknown) =>
  runValidatedAction(categoryServerZodSchema, values, "Failed to create category", (payload) => createCategory(payload));

export const updateCategoryAction = async (categoryId: string, values: unknown) =>
  requireId(categoryId, "category") ??
  runValidatedAction(categoryServerZodSchema, values, "Failed to update category", (payload) => updateCategory(categoryId, payload));

export const setCategoryActiveAction = async (categoryId: string, isActive: boolean) =>
  requireId(categoryId, "category") ??
  runAction(isActive ? "Failed to activate category" : "Failed to deactivate category", () => updateCategory(categoryId, { isActive }));
