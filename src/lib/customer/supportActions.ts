"use server";

import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage, type FeatureIdea, type SupportConversation } from "./api";
import { customerApi } from "./apiClient";

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

const SUPPORT = `${API_BASE_URL}/api/support`;

export async function getSupportMessagesAction(): Promise<ActionResult<SupportConversation[]>> {
  return callApi(async () => (await customerApi.get<SupportConversation[]>(`${SUPPORT}/messages`, { headers: await authHeaders() })).data, "Failed to load your messages");
}

// A new message: `category`, `message` and an optional `screenshot` file,
// built client-side. Uses fetch(), not axios, for the multipart body (see
// uploadContactPhotoAction).
export async function sendSupportMessageAction(formData: FormData): Promise<ActionResult<SupportConversation>> {
  try {
    const response = await fetch(`${SUPPORT}/messages`, {
      method: "POST",
      headers: { ...(await authHeaders()), ...(await getClientHeaders()) },
      body: formData,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) return { success: false, message: getApiErrorMessage(body, "Failed to send your message") };
    return { success: true, data: body as SupportConversation };
  } catch {
    return { success: false, message: "Failed to send your message" };
  }
}

export async function replySupportMessageAction(id: string, message: string): Promise<ActionResult<SupportConversation>> {
  return callApi(async () => (await customerApi.post<SupportConversation>(`${SUPPORT}/messages/${encodeURIComponent(id)}/replies`, { message }, { headers: await authHeaders() })).data, "Failed to send your reply");
}

// "Mark as solved" in a conversation.
export async function solveSupportMessageAction(id: string): Promise<ActionResult<SupportConversation>> {
  return callApi(async () => (await customerApi.post<SupportConversation>(`${SUPPORT}/messages/${encodeURIComponent(id)}/solve`, {}, { headers: await authHeaders() })).data, "Couldn't mark it as solved");
}

export async function getIdeasAction(): Promise<ActionResult<FeatureIdea[]>> {
  return callApi(async () => (await customerApi.get<FeatureIdea[]>(`${SUPPORT}/ideas`, { headers: await authHeaders() })).data, "Failed to load ideas");
}

export async function createIdeaAction(input: { title: string; description?: string }): Promise<ActionResult<FeatureIdea>> {
  return callApi(async () => (await customerApi.post<FeatureIdea>(`${SUPPORT}/ideas`, input, { headers: await authHeaders() })).data, "Failed to add your idea");
}

export async function voteIdeaAction(id: string, on: boolean): Promise<ActionResult<FeatureIdea>> {
  return callApi(async () => {
    const url = `${SUPPORT}/ideas/${encodeURIComponent(id)}/vote`;
    const headers = await authHeaders();
    return (on ? await customerApi.post<FeatureIdea>(url, {}, { headers }) : await customerApi.delete<FeatureIdea>(url, { headers })).data;
  }, "Failed to save your vote");
}
