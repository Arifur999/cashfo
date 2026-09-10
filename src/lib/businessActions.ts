"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BusinessDetail, type BusinessLimits, type UserBusiness } from "./api";
import { getAccessToken } from "./tokenCookies";
import { setActiveBusinessCookie } from "./activeBusiness";
import { getBusinessLimits } from "./businesses";

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

// No redirect/response needed -- the client calls router.refresh() right
// after this to re-render the current page with the newly-active workspace.
export async function switchWorkspaceAction(businessId: string): Promise<void> {
  await setActiveBusinessCookie(businessId);
}

export interface CreateBusinessInput {
  name: string;
  currency: string;
}

export async function createBusinessAction(input: CreateBusinessInput): Promise<ActionResult<UserBusiness>> {
  return callApi(async () => {
    const res = await axios.post<UserBusiness>(
      `${API_BASE_URL}/api/businesses`,
      { name: input.name, type: "BUSINESS", currency: input.currency },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to create workspace");
}

// /api/auth/me's businesses list omits currency (Prompt 2 never needed it);
// fetching the single-business detail route is simpler than adding it there.
export async function getBusinessDetailAction(id: string): Promise<ActionResult<BusinessDetail>> {
  return callApi(async () => {
    const res = await axios.get<BusinessDetail>(`${API_BASE_URL}/api/businesses/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load workspace");
}

export async function updateBusinessAction(id: string, input: Partial<CreateBusinessInput>): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/api/businesses/${id}`, input, { headers: await authHeaders() });
  }, "Failed to update workspace");
}

export async function deleteBusinessAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${id}`, { headers: await authHeaders() });
  }, "Failed to delete workspace");
}

// A Server Action wrapper around lib/businesses.ts's cached fetcher -- Client
// Components (like CreateWorkspaceModal, which needs a fresh count each time
// it opens) can't call a plain server-only function directly, only a real
// Server Action.
export async function getBusinessLimitsAction(): Promise<BusinessLimits | null> {
  return getBusinessLimits();
}
