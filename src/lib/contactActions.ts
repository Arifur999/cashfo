"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Contact, type ContactCategory, type ContactType } from "./api";
import { getAccessToken } from "./tokenCookies";

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

export interface ContactFormInput {
  name: string;
  type: ContactType;
  category?: ContactCategory;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance?: string;
  notes?: string;
}

export async function createContactAction(businessId: string, input: ContactFormInput): Promise<ActionResult<Contact>> {
  return callApi(async () => {
    const res = await axios.post<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create contact");
}

export async function updateContactAction(
  businessId: string,
  id: string,
  input: Partial<Omit<ContactFormInput, "openingBalance">>,
): Promise<ActionResult<Contact>> {
  return callApi(async () => {
    const res = await axios.patch<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update contact");
}

export async function archiveContactAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${id}/archive`, {}, { headers: await authHeaders() });
  }, "Failed to archive contact");
}
