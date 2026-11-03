"use server";

import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage, type CurrentUser, type LanguagePreference, type LoginHistoryEntry, type UserSessionSummary } from "./api";
import { customerApi } from "./apiClient";

// Logging out is the site-wide logoutAction (app/-actions/authActions.ts).

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
  // One line; an empty string clears it.
  address?: string;
}

// Settings > Profile page's "Save Changes" -- name/phone only, email stays
// read-only there (see backend UserAuthService.updateProfile()'s comment).
export async function updateProfileAction(input: UpdateProfileInput): Promise<ActionResult<Pick<CurrentUser, "id" | "name" | "email" | "phone" | "avatarUrl">>> {
  return callApi(async () => {
    const res = await customerApi.patch(`${API_BASE_URL}/api/auth/profile`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update profile");
}

// The top bar's language switch: the screen follows the locale cookie at
// once; this keeps the account's stored preference (the language of its
// emails) in step with it.
export async function saveLanguageAction(preferredLanguage: LanguagePreference): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.patch(`${API_BASE_URL}/api/auth/language`, { preferredLanguage }, { headers: await authHeaders() });
  }, "Failed to save language");
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  // Left out, the API signs the other devices out.
  signOutOthers?: boolean;
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/auth/change-password`, input, { headers: await authHeaders() });
  }, "Failed to change password");
}

// Uses fetch(), not axios, specifically for this call -- axios's Node
// adapter doesn't reliably set the multipart boundary header for a native
// (web-standard) FormData body the way fetch does automatically. Same
// reasoning as uploadContactPhotoAction() in contactActions.ts.
export async function uploadAvatarAction(formData: FormData): Promise<ActionResult<{ id: string; avatarUrl: string }>> {
  return uploadProfileImage("avatar", formData, "Failed to upload avatar");
}

// The wide photo over the profile, and taking it off again (back to the
// gradient).
export async function uploadCoverAction(formData: FormData): Promise<ActionResult<{ id: string; coverUrl: string }>> {
  return uploadProfileImage("cover", formData, "Failed to upload the cover");
}

// "Remove photo": back to the initials.
export async function removeAvatarAction(): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/auth/avatar`, { headers: await authHeaders() });
  }, "Couldn't remove the photo");
}

// "Undo": the photo it had before (null: back to the initials). The API
// takes only our own uploads and Google photos.
export async function restoreAvatarAction(url: string | null): Promise<ActionResult> {
  return callApi(async () => {
    const headers = await authHeaders();
    if (url) await customerApi.put(`${API_BASE_URL}/api/auth/avatar`, { url }, { headers });
    else await customerApi.delete(`${API_BASE_URL}/api/auth/avatar`, { headers });
  }, "Couldn't put the photo back");
}

export async function removeCoverAction(): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/auth/cover`, { headers: await authHeaders() });
  }, "Failed to remove the cover");
}

// A profile image (the photo or the cover) as the API's multipart upload.
async function uploadProfileImage<T>(kind: "avatar" | "cover", formData: FormData, fallback: string): Promise<ActionResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/${kind}`, {
      method: "POST",
      // The visitor's address and browser too, like every other call (see
      // apiClient.ts) -- fetch() skips customerApi's interceptor.
      headers: { ...(await authHeaders()), ...(await getClientHeaders()) },
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return { success: false, message: getApiErrorMessage(body, fallback) };
    }
    return { success: true, data: await response.json() };
  } catch {
    return { success: false, message: fallback };
  }
}

// Settings > Profile > Share profile card: on (the card page goes up at
// /card/<code>) or off (it shows nothing).
export async function setProfileCardSharedAction(shared: boolean): Promise<ActionResult<{ shared: boolean; code: string | null }>> {
  return callApi(async () => (await customerApi.put(`${API_BASE_URL}/api/profile-card`, { shared }, { headers: await authHeaders() })).data, "Couldn't change the profile card");
}

// Settings > Security > Device Management's "Devices" list.
export async function getSessionsAction(): Promise<ActionResult<UserSessionSummary[]>> {
  return callApi(async () => {
    const headers = { ...(await authHeaders()), ...(await getClientHeaders()) };
    const res = await customerApi.get<UserSessionSummary[]>(`${API_BASE_URL}/api/auth/sessions`, { headers });
    return res.data;
  }, "Failed to load devices");
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/auth/sessions/${sessionId}`, { headers: await authHeaders() });
  }, "Failed to sign out that device");
}

// Settings > Security > Device Management's "History" list.
export async function getLoginHistoryAction(): Promise<ActionResult<LoginHistoryEntry[]>> {
  return callApi(async () => {
    const res = await customerApi.get<LoginHistoryEntry[]>(`${API_BASE_URL}/api/auth/login-history`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load login history");
}
