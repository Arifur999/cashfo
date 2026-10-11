"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  ICreateTranslationPayload,
  ITranslation,
  ITranslationBundles,
  IUpdateTranslationPayload,
} from "@/types/translation.types";

const BASE = "/admin/config/translations";

// Every string, sorted by key; the table filters them in memory.
export const getTranslations = async () => httpClient.get<ITranslation[]>(BASE);

export const createTranslation = async (payload: ICreateTranslationPayload) => httpClient.post<ITranslation>(BASE, payload);

export const updateTranslation = async (id: string, payload: IUpdateTranslationPayload) =>
  httpClient.patch<ITranslation>(`${BASE}/${id}`, payload);

export const exportTranslations = async () => httpClient.get<ITranslationBundles>(`${BASE}/export`);
