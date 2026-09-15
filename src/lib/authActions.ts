"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL, getApiErrorMessage, type CurrentUser, type LoginHistoryEntry, type UserSessionSummary } from "./api";
import { clientRequestHeaders } from "./clientContext";
import { clearAuthCookies, getAccessToken, getRefreshToken } from "./tokenCookies";

export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, { refreshToken });
    } catch {
      // Best-effort -- clear the local session regardless of whether the
      // backend call succeeded.
    }
  }
  await clearAuthCookies();
  redirect("/login");
}

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

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

// Settings > Profile page's "Save Changes" -- name/phone only, email stays
// read-only there (see backend UserAuthService.updateProfile()'s comment).
export async function updateProfileAction(input: UpdateProfileInput): Promise<ActionResult<Pick<CurrentUser, "id" | "name" | "email" | "phone" | "avatarUrl">>> {
  return callApi(async () => {
    const res = await axios.patch(`${API_BASE_URL}/api/auth/profile`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update profile");
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/api/auth/change-password`, input, { headers: await authHeaders() });
  }, "Failed to change password");
}

// Uses fetch(), not axios, specifically for this call -- axios's Node
// adapter doesn't reliably set the multipart boundary header for a native
// (web-standard) FormData body the way fetch does automatically. Same
// reasoning as uploadContactPhotoAction() in contactActions.ts.
export async function uploadAvatarAction(formData: FormData): Promise<ActionResult<{ id: string; avatarUrl: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
      method: "POST",
      headers: await authHeaders(),
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { success: false, message: getApiErrorMessage(body, "Failed to upload avatar") };
    }
    return { success: true, data: await response.json() };
  } catch {
    return { success: false, message: "Failed to upload avatar" };
  }
}

// Settings > Security > Device Management's "Devices" list.
export async function getSessionsAction(): Promise<ActionResult<UserSessionSummary[]>> {
  return callApi(async () => {
    const headers = { ...(await authHeaders()), ...(await clientRequestHeaders()) };
    const res = await axios.get<UserSessionSummary[]>(`${API_BASE_URL}/api/auth/sessions`, { headers });
    return res.data;
  }, "Failed to load devices");
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/auth/sessions/${sessionId}`, { headers: await authHeaders() });
  }, "Failed to sign out that device");
}

// Settings > Security > Device Management's "History" list.
export async function getLoginHistoryAction(): Promise<ActionResult<LoginHistoryEntry[]>> {
  return callApi(async () => {
    const res = await axios.get<LoginHistoryEntry[]>(`${API_BASE_URL}/api/auth/login-history`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load login history");
}
