"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ICategory, ICategoryPayload } from "@/types/category.types";

const BASE = "/admin/config/categories";

export const getCategories = async () => httpClient.get<ICategory[]>(BASE);

export const createCategory = async (payload: ICategoryPayload) => httpClient.post<ICategory>(BASE, payload);

export const updateCategory = async (id: string, payload: Partial<ICategoryPayload> & { isActive?: boolean }) =>
  httpClient.patch<ICategory>(`${BASE}/${id}`, payload);
