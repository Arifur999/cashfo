"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type VaultEntryCategory, type VaultEntrySummary } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

// Vault routes need BOTH the normal access token AND the short-lived vault
// token from unlockVaultAction() -- the vault token is kept only in the
// PasswordVaultPageClient's own React state (never a cookie), so it's
// passed in explicitly on every call and forwarded as this header, exactly
// matching backend VaultAccessGuard's expectation.
async function vaultHeaders(vaultToken: string) {
  return { ...(await authHeaders()), "x-vault-token": vaultToken };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // NestJS's ThrottlerException carries the literal string
      // "ThrottlerException: Too Many Requests" as its message -- surfacing
      // that raw to a user reads as a crash, not a rate limit, so it gets
      // its own friendly copy instead of falling through to
      // getApiErrorMessage() below.
      if (error.response?.status === 429) {
        return { success: false, message: "Too many attempts -- please wait a few minutes and try again." };
      }
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function getVaultStatusAction(): Promise<ActionResult<{ hasVaultPassword: boolean }>> {
  return callApi(async () => {
    const res = await customerApi.get(`${API_BASE_URL}/api/vault/status`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to check vault status");
}

// First-time setup sends the account password and the new vault password;
// changing an existing one also needs the current vault password.
export interface SetVaultPasswordInput {
  currentPassword: string;
  vaultPassword: string;
  currentVaultPassword?: string;
}

// "Forgot vault password?": the saved entries are encrypted with the old
// vault password, so a reset can only start over -- it deletes every entry.
// `confirm` is the API's guard against doing that by accident.
export async function resetVaultAction(input: { currentPassword: string; vaultPassword: string }): Promise<ActionResult<{ deletedEntries: number }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ success: boolean; deletedEntries: number }>(
      `${API_BASE_URL}/api/vault/reset`,
      { ...input, confirm: "DELETE_ALL_ENTRIES" },
      { headers: await authHeaders() },
    );
    return { deletedEntries: res.data.deletedEntries };
  }, "Failed to reset the vault");
}

export async function setVaultPasswordAction(input: SetVaultPasswordInput): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/vault/password`, input, { headers: await authHeaders() });
  }, "Failed to set vault password");
}

export async function unlockVaultAction(vaultPassword: string): Promise<ActionResult<{ vaultToken: string; expiresIn: string }>> {
  return callApi(async () => {
    const res = await customerApi.post(`${API_BASE_URL}/api/vault/unlock`, { vaultPassword }, { headers: await authHeaders() });
    return res.data;
  }, "Incorrect vault password");
}

export async function listVaultEntriesAction(vaultToken: string): Promise<ActionResult<VaultEntrySummary[]>> {
  return callApi(async () => {
    const res = await customerApi.get<VaultEntrySummary[]>(`${API_BASE_URL}/api/vault/entries`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to load vault entries");
}

export interface VaultEntryInput {
  title: string;
  category: VaultEntryCategory;
  websiteUrl?: string;
  holderName?: string;
  usernameOrEmail?: string;
  password?: string;
  notes?: string;
}

export async function createVaultEntryAction(vaultToken: string, input: VaultEntryInput): Promise<ActionResult<VaultEntrySummary>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultEntrySummary>(`${API_BASE_URL}/api/vault/entries`, input, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to save vault entry");
}

export async function updateVaultEntryAction(
  vaultToken: string,
  id: string,
  input: Partial<VaultEntryInput>,
): Promise<ActionResult<VaultEntrySummary>> {
  return callApi(async () => {
    const res = await customerApi.patch<VaultEntrySummary>(`${API_BASE_URL}/api/vault/entries/${id}`, input, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to update vault entry");
}

export async function deleteVaultEntryAction(vaultToken: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/vault/entries/${id}`, { headers: await vaultHeaders(vaultToken) });
  }, "Failed to delete vault entry");
}

export async function revealVaultEntryAction(vaultToken: string, id: string): Promise<ActionResult<{ password: string }>> {
  return callApi(async () => {
    const res = await customerApi.get(`${API_BASE_URL}/api/vault/entries/${id}/reveal`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to reveal password");
}
