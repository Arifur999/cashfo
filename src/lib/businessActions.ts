"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BusinessDetail, type BusinessLimits, type WorkspaceListItem } from "./api";
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
  phone?: string;
  email?: string;
  pin?: string;
  // Defaults to "BUSINESS" (every existing caller creates a second
  // Business-type workspace) -- Group Expense's own create flow passes
  // "GROUP" explicitly. See BusinessesService.create() -- PERSONAL can
  // never be created here either way.
  type?: "BUSINESS" | "GROUP";
}

export async function createBusinessAction(input: CreateBusinessInput): Promise<ActionResult<WorkspaceListItem>> {
  return callApi(async () => {
    const res = await axios.post<WorkspaceListItem>(
      `${API_BASE_URL}/api/businesses`,
      { name: input.name, type: input.type ?? "BUSINESS", currency: input.currency, phone: input.phone, email: input.email, pin: input.pin },
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

// Settings > Workspaces list page -- the richer list-item shape (phone,
// email, hasPinLock, trialEndsAt, monthlyFee) that /api/auth/me's embedded
// businesses array doesn't carry.
export async function listBusinessesAction(): Promise<ActionResult<WorkspaceListItem[]>> {
  return callApi(async () => {
    const res = await axios.get<WorkspaceListItem[]>(`${API_BASE_URL}/api/businesses`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load workspaces");
}

export async function verifyBusinessPinAction(businessId: string, pin: string): Promise<ActionResult<{ valid: boolean }>> {
  return callApi(async () => {
    const res = await axios.post<{ valid: boolean }>(
      `${API_BASE_URL}/api/businesses/${businessId}/verify-pin`,
      { pin },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to verify PIN");
}

// A Server Action wrapper around lib/businesses.ts's cached fetcher -- Client
// Components (like CreateWorkspaceModal, which needs a fresh count each time
// it opens) can't call a plain server-only function directly, only a real
// Server Action.
export async function getBusinessLimitsAction(): Promise<BusinessLimits | null> {
  return getBusinessLimits();
}
