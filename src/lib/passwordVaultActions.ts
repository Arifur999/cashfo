"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type VaultEntryCategory, type VaultEntrySummary } from "./api";
import { getAccessToken } from "./tokenCookies";
import type { ActionResult } from "./authActions";

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
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function getVaultStatusAction(): Promise<ActionResult<{ hasVaultPassword: boolean }>> {
  return callApi(async () => {
    const res = await axios.get(`${API_BASE_URL}/api/vault/status`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to check vault status");
}

export interface SetVaultPasswordInput {
  currentPassword: string;
  vaultPassword: string;
}

export async function setVaultPasswordAction(input: SetVaultPasswordInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/api/vault/password`, input, { headers: await authHeaders() });
  }, "Failed to set vault password");
}

export async function unlockVaultAction(vaultPassword: string): Promise<ActionResult<{ vaultToken: string; expiresIn: string }>> {
  return callApi(async () => {
    const res = await axios.post(`${API_BASE_URL}/api/vault/unlock`, { vaultPassword }, { headers: await authHeaders() });
    return res.data;
  }, "Incorrect vault password");
}

export async function listVaultEntriesAction(vaultToken: string): Promise<ActionResult<VaultEntrySummary[]>> {
  return callApi(async () => {
    const res = await axios.get<VaultEntrySummary[]>(`${API_BASE_URL}/api/vault/entries`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to load vault entries");
}

export interface VaultEntryInput {
  title: string;
  category: VaultEntryCategory;
  websiteUrl?: string;
  usernameOrEmail?: string;
  password?: string;
  notes?: string;
}

export async function createVaultEntryAction(vaultToken: string, input: VaultEntryInput): Promise<ActionResult<VaultEntrySummary>> {
  return callApi(async () => {
    const res = await axios.post<VaultEntrySummary>(`${API_BASE_URL}/api/vault/entries`, input, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to save vault entry");
}

export async function updateVaultEntryAction(
  vaultToken: string,
  id: string,
  input: Partial<VaultEntryInput>,
): Promise<ActionResult<VaultEntrySummary>> {
  return callApi(async () => {
    const res = await axios.patch<VaultEntrySummary>(`${API_BASE_URL}/api/vault/entries/${id}`, input, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to update vault entry");
}

export async function deleteVaultEntryAction(vaultToken: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/vault/entries/${id}`, { headers: await vaultHeaders(vaultToken) });
  }, "Failed to delete vault entry");
}

export async function revealVaultEntryAction(vaultToken: string, id: string): Promise<ActionResult<{ password: string }>> {
  return callApi(async () => {
    const res = await axios.get(`${API_BASE_URL}/api/vault/entries/${id}/reveal`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to reveal password");
}
