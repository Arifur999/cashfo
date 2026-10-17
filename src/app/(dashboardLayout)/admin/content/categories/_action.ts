"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createCategory, updateCategory } from "@/services/category.services";
import { categoryOrderServerZodSchema, categoryServerZodSchema } from "@/zod/category.validation";

export const createCategoryAction = async (values: unknown) =>
  runValidatedAction(categoryServerZodSchema, values, "Failed to create category", (payload) => createCategory(payload));

export const updateCategoryAction = async (categoryId: string, values: unknown) =>
  requireId(categoryId, "category") ??
  runValidatedAction(categoryServerZodSchema, values, "Failed to update category", (payload) => updateCategory(categoryId, payload));

// The places a drag gave the categories, saved one by one (the API orders
// by displayOrder); the reply is the last one saved.
export const reorderCategoriesAction = async (orders: unknown) =>
  runValidatedAction(categoryOrderServerZodSchema, orders, "Failed to save the new order", async (list) => {
    const saved = await Promise.all(list.map(({ id, displayOrder }) => updateCategory(id, { displayOrder })));
    return saved[saved.length - 1];
  });

export const setCategoryActiveAction = async (categoryId: string, isActive: boolean) =>
  requireId(categoryId, "category") ??
  runAction(isActive ? "Failed to activate category" : "Failed to deactivate category", () => updateCategory(categoryId, { isActive }));
