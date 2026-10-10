"use server";

import axios from "axios";
import {
  API_BASE_URL,
  getApiErrorMessage,
  type AccountType,
  type AnnouncementType,
  type CategoryDirection,
  type LegalDocType,
  type WorkspaceType,
} from "@/lib/api";
import { getAccessToken } from "@/lib/tokenCookies";

export interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

// --- Account templates ---

export interface AccountTemplateFormInput {
  name: string;
  nameBn: string;
  accountType: AccountType;
  accountSubtype?: string;
  parentId?: string;
  appliesTo: WorkspaceType[];
}

export async function createAccountTemplateAction(input: AccountTemplateFormInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/config/account-templates`, input, { headers: await authHeaders() });
  }, "Failed to create account template");
}

export async function updateAccountTemplateAction(id: string, input: Partial<AccountTemplateFormInput>): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/config/account-templates/${id}`, input, { headers: await authHeaders() });
  }, "Failed to update account template");
}

export async function deactivateAccountTemplateAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/config/account-templates/${id}/deactivate`, {}, { headers: await authHeaders() });
  }, "Failed to deactivate account template");
}

// --- Categories ---

export interface CategoryFormInput {
  name: string;
  nameBn: string;
  type: CategoryDirection;
  icon?: string;
  linkedAccountTemplateId?: string;
}

export async function createCategoryAction(input: CategoryFormInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/config/categories`, input, { headers: await authHeaders() });
  }, "Failed to create category");
}

export async function updateCategoryAction(id: string, input: Partial<CategoryFormInput>): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/config/categories/${id}`, input, { headers: await authHeaders() });
  }, "Failed to update category");
}

// --- Translations ---

export async function updateTranslationAction(id: string, field: "en" | "bn", value: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/config/translations/${id}`, { [field]: value }, { headers: await authHeaders() });
  }, "Failed to update translation");
}

export async function createTranslationAction(input: { key: string; en: string; bn: string; context?: string }): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/config/translations`, input, { headers: await authHeaders() });
  }, "Failed to create translation");
}

export async function exportTranslationsAction(): Promise<ActionResult<{ en: object; bn: object }>> {
  return callApi(async () => {
    const res = await axios.get<{ en: object; bn: object }>(`${API_BASE_URL}/admin/config/translations/export`, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to export translations");
}

// --- Announcements ---

export interface AnnouncementFormInput {
  title: string;
  titleBn?: string;
  body: string;
  bodyBn?: string;
  type: AnnouncementType;
  targetPlan?: string;
  startAt: string;
  endAt?: string;
}

export async function createAnnouncementAction(input: AnnouncementFormInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/announcements`, input, { headers: await authHeaders() });
  }, "Failed to create announcement");
}

export async function toggleAnnouncementActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/announcements/${id}`, { isActive }, { headers: await authHeaders() });
  }, "Failed to update announcement");
}

// --- Legal documents ---

export async function updateLegalDocumentAction(
  type: LegalDocType,
  input: { contentEn?: string; contentBn?: string },
): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/config/legal/${type}`, input, { headers: await authHeaders() });
  }, "Failed to update legal document");
}
