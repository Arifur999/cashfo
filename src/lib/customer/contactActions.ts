"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Contact, type ContactCategory, type ContactType } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";
import { getClientHeaders } from "@/lib/axios/clientHeaders";

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

// The API's own words when it sent some, else nothing: the caller then shows
// its fallback ("Failed to update contact") through t(), in the reader's
// language, where a fallback filled in here would always reach it in English.
const apiMessage = (body: unknown): string | undefined => getApiErrorMessage(body, "") || undefined;

async function callApi<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: axios.isAxiosError(error) ? apiMessage(error.response?.data) : undefined };
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
  photoUrl?: string;
}

export async function createContactAction(businessId: string, input: ContactFormInput): Promise<ActionResult<Contact>> {
  return callApi(async () => {
    const res = await customerApi.post<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts`, input, { headers: await authHeaders() });
    return res.data;
  });
}

export async function updateContactAction(
  businessId: string,
  id: string,
  input: Partial<Omit<ContactFormInput, "openingBalance">>,
): Promise<ActionResult<Contact>> {
  return callApi(async () => {
    const res = await customerApi.patch<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${id}`, input, { headers: await authHeaders() });
    return res.data;
  });
}

// Uses fetch(), not axios, specifically for this call -- axios's Node
// adapter doesn't reliably set the multipart boundary header for a native
// (web-standard) FormData body the way fetch does automatically. The
// FormData itself is built client-side (a File the user picked) and
// arrives here intact -- Server Actions support FormData as an argument.
export async function uploadContactPhotoAction(businessId: string, formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}/contacts/upload-photo`, {
      method: "POST",
      // The visitor's address and browser too, like every other call (see
      // apiClient.ts) -- fetch() skips customerApi's interceptor.
      headers: { ...(await authHeaders()), ...(await getClientHeaders()) },
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { success: false, message: apiMessage(body) };
    }
    return { success: true, data: await response.json() };
  } catch {
    return { success: false };
  }
}

export async function archiveContactAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.patch(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${id}/archive`, {}, { headers: await authHeaders() });
  });
}

export interface DeleteContactResult {
  id: string;
  // Real permanent delete when this contact has zero transactions;
  // otherwise the backend falls back to archiving it instead (see
  // ContactsService.delete()) -- the caller shows a different toast
  // depending on which one actually happened.
  action: "deleted" | "archived";
}

export async function deleteContactAction(businessId: string, id: string): Promise<ActionResult<DeleteContactResult>> {
  return callApi(async () => {
    const res = await customerApi.delete<DeleteContactResult>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${id}`, {
      headers: await authHeaders(),
    });
    return res.data;
  });
}
