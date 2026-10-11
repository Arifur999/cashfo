"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAccountTemplate, IAccountTemplatePayload } from "@/types/accountTemplate.types";

const BASE = "/admin/config/account-templates";

// Top-level accounts with their direct children nested.
export const getAccountTemplates = async () => httpClient.get<IAccountTemplate[]>(BASE);

export const createAccountTemplate = async (payload: IAccountTemplatePayload) => httpClient.post<IAccountTemplate>(BASE, payload);

export const updateAccountTemplate = async (id: string, payload: Partial<IAccountTemplatePayload> & { isActive?: boolean }) =>
  httpClient.patch<IAccountTemplate>(`${BASE}/${id}`, payload);

export const deactivateAccountTemplate = async (id: string) => httpClient.patch<IAccountTemplate>(`${BASE}/${id}/deactivate`);
