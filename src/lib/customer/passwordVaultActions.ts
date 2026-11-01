"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { getAccessToken } from "@/lib/tokenUtils";
import { requestPasswordReset } from "@/services/passwordReset.services";
import { API_BASE_URL, getApiErrorMessage, type VaultCheckup, type VaultEntryCategory, type VaultEntrySummary } from "./api";
import { getCurrentUser } from "./auth";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";
import type { VaultStatus } from "./vault";

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

// What a vault call answers: the shared result, plus the API's own reason
// for a refusal and the counts that go with it -- unlock tries left, a
// code's tries left, the seconds before a locked-out vault or a resend may
// try again -- so the forms can say exactly what happened.
export interface VaultResult<T = void> extends ActionResult<T> {
  reason?: string;
  triesLeft?: number;
  attemptsLeft?: number;
  retryAfterSec?: number;
}

interface VaultErrorBody {
  reason?: unknown;
  triesLeft?: unknown;
  attemptsLeft?: unknown;
  retryAfterSec?: unknown;
}

const numberOr = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<VaultResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = (error.response?.data ?? {}) as VaultErrorBody;
      const triesLeft = numberOr(body.triesLeft);
      const attemptsLeft = numberOr(body.attemptsLeft);
      const retryAfterSec = numberOr(body.retryAfterSec);
      const extra = {
        ...(typeof body.reason === "string" && { reason: body.reason }),
        ...(triesLeft !== undefined && { triesLeft }),
        ...(attemptsLeft !== undefined && { attemptsLeft }),
        ...(retryAfterSec !== undefined && { retryAfterSec }),
      };
      // NestJS's ThrottlerException carries the literal string
      // "ThrottlerException: Too Many Requests" as its message -- surfacing
      // that raw to a user reads as a crash, not a rate limit, so it gets
      // the app's one friendly (and translated) wording instead. A 429 with
      // a reason of its own (a locked-out vault, a code asked again too
      // soon) keeps the API's words.
      if (error.response?.status === 429 && !extra.reason) {
        return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE, reason: "THROTTLED" };
      }
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage), ...extra };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function getVaultStatusAction(): Promise<ActionResult<VaultStatus>> {
  return callApi(async () => {
    const res = await customerApi.get<VaultStatus>(`${API_BASE_URL}/api/vault/status`, { headers: await authHeaders() });
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

// "Forgot vault password?", step one: the account password (left out for
// a Google-only account, which a recent sign-in stands in for), and the
// API emails a six-digit code. Only the password that opens the vault
// changes; the saved logins stay.
export interface VaultResetChallenge {
  challengeId: string;
  channel: "EMAIL" | "SMS";
  // Masked: "s***@example.com".
  sentTo: string;
  resendAfterSec: number;
  expiresAt: string;
  attemptsLeft: number;
  sendsLeft: number;
}

export async function startVaultResetAction(input: { currentPassword?: string }): Promise<VaultResult<VaultResetChallenge>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultResetChallenge>(`${API_BASE_URL}/api/vault/reset/start`, input, { headers: await authHeaders() });
    return res.data;
  }, "We could not send the code. Please try again in a minute.");
}

export async function resendVaultResetCodeAction(challengeId: string): Promise<VaultResult<VaultResetChallenge>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultResetChallenge>(`${API_BASE_URL}/api/vault/reset/start/${encodeURIComponent(challengeId)}/resend`, {}, { headers: await authHeaders() });
    return res.data;
  }, "We could not send the code. Please try again in a minute.");
}

// Step two: the identity again, the code, and the new vault password.
export async function resetVaultAction(input: { currentPassword?: string; vaultPassword: string; challengeId: string; code: string }): Promise<VaultResult<{ entryCount: number }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ success: boolean; entryCount: number }>(`${API_BASE_URL}/api/vault/reset`, input, { headers: await authHeaders() });
    return { entryCount: res.data.entryCount };
  }, "Failed to reset the vault");
}

// How long one unlock lasts, from the next unlock on: minutes (1 to 30),
// or null for the server's own. The answer says what an unlock really
// lasts, which the server may cap.
export async function updateVaultSettingsAction(lockMinutes: number | null): Promise<VaultResult<{ lockMinutes: number | null; effectiveMinutes: number }>> {
  return callApi(async () => {
    const res = await customerApi.patch<{ lockMinutes: number | null; effectiveMinutes: number }>(`${API_BASE_URL}/api/vault/settings`, { lockMinutes }, { headers: await authHeaders() });
    return res.data;
  }, "Couldn't save the lock time");
}

// The first vault password opens the new, empty vault: the answer carries
// its token (null after a change, and from an older API).
export async function setVaultPasswordAction(input: SetVaultPasswordInput): Promise<VaultResult<VaultUnlock | null>> {
  return callApi(async () => {
    const res = await customerApi.post<Partial<VaultUnlock>>(`${API_BASE_URL}/api/vault/password`, input, { headers: await authHeaders() });
    const data = res.data ?? {};
    return data.vaultToken ? { vaultToken: data.vaultToken, expiresIn: data.expiresIn ?? "600s", expiresInSec: data.expiresInSec } : null;
  }, "Failed to set vault password");
}

// A wrong password comes back as the API's own "Incorrect vault password"
// with the tries left (reason VAULT_PASSWORD_WRONG); after ten in ten
// minutes, 429 VAULT_LOCKED_OUT with the seconds to wait. The fallback is
// for an answer that never came, which is no wrong password.
export interface VaultUnlock {
  vaultToken: string;
  // A span string ("600s"); expiresInSec is the same in seconds.
  expiresIn: string;
  expiresInSec?: number;
}

// Unlocking is two steps: the right vault password emails a six-digit code
// (the challenge), and the code opens the vault. An older API opened it
// with the password alone, answering the token straight away.
export type VaultUnlockStep = ({ step: "open" } & VaultUnlock) | ({ step: "code" } & VaultResetChallenge);

export async function unlockVaultAction(vaultPassword: string): Promise<VaultResult<VaultUnlockStep>> {
  return callApi(async (): Promise<VaultUnlockStep> => {
    const res = await customerApi.post<Partial<VaultUnlock & VaultResetChallenge>>(`${API_BASE_URL}/api/vault/unlock`, { vaultPassword }, { headers: await authHeaders() });
    const data = res.data;
    if (data.vaultToken) return { step: "open", vaultToken: data.vaultToken, expiresIn: data.expiresIn ?? "600s", expiresInSec: data.expiresInSec };
    return {
      step: "code",
      challengeId: data.challengeId ?? "",
      channel: data.channel ?? "EMAIL",
      sentTo: data.sentTo ?? "",
      resendAfterSec: data.resendAfterSec ?? 30,
      expiresAt: data.expiresAt ?? "",
      attemptsLeft: data.attemptsLeft ?? 5,
      sendsLeft: data.sendsLeft ?? 4,
    };
  }, "Couldn't open the vault. Please try again.");
}

// The second step: the emailed code. A wrong one answers CODE_WRONG with the
// tries left; after five, TOO_MANY_ATTEMPTS, and it's back to step one.
export async function verifyVaultUnlockAction(challengeId: string, code: string): Promise<VaultResult<VaultUnlock>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultUnlock>(`${API_BASE_URL}/api/vault/unlock/verify`, { challengeId, code }, { headers: await authHeaders() });
    return { vaultToken: res.data.vaultToken, expiresIn: res.data.expiresIn, expiresInSec: res.data.expiresInSec };
  }, "Couldn't open the vault. Please try again.");
}

// A new code; the old one stops working.
export async function resendVaultUnlockCodeAction(challengeId: string): Promise<VaultResult<VaultResetChallenge>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultResetChallenge>(`${API_BASE_URL}/api/vault/unlock/${encodeURIComponent(challengeId)}/resend`, {}, { headers: await authHeaders() });
    return res.data;
  }, "We could not send the code. Please try again in a minute.");
}

export async function listVaultEntriesAction(vaultToken: string): Promise<ActionResult<VaultEntrySummary[]>> {
  return callApi(async () => {
    const res = await customerApi.get<VaultEntrySummary[]>(`${API_BASE_URL}/api/vault/entries`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to load vault entries");
}

// The optional texts take null on an edit: it clears the field, where
// leaving the key out keeps what was saved (see entryInput in
// vaultDisplay.ts).
export interface VaultEntryInput {
  title: string;
  category: VaultEntryCategory;
  websiteUrl?: string | null;
  holderName?: string | null;
  usernameOrEmail?: string | null;
  password?: string;
  notes?: string | null;
  isFavorite?: boolean;
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

export async function getVaultCheckupAction(vaultToken: string): Promise<ActionResult<VaultCheckup>> {
  return callApi(async () => {
    const res = await customerApi.get<VaultCheckup>(`${API_BASE_URL}/api/vault/checkup`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to run the security checkup");
}

// "It's fine": the checkup stops calling this login's password old until it
// changes.
export async function dismissVaultCheckupAction(vaultToken: string, id: string): Promise<ActionResult<VaultEntrySummary>> {
  return callApi(async () => {
    const res = await customerApi.post<VaultEntrySummary>(`${API_BASE_URL}/api/vault/entries/${id}/checkup-dismiss`, {}, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to update vault entry");
}

export async function revealVaultEntryAction(vaultToken: string, id: string): Promise<ActionResult<{ password: string }>> {
  return callApi(async () => {
    const res = await customerApi.get(`${API_BASE_URL}/api/vault/entries/${id}/reveal`, { headers: await vaultHeaders(vaultToken) });
    return res.data;
  }, "Failed to reveal password");
}

// Setting up, changing or resetting the vault asks for the account
// password, which a Google-only account doesn't have. This mails the
// signed-in customer -- at their own address, never one sent from the page --
// the link the sign-in page's "Forgot password?" sends, so they can set one
// without signing out first. A support view changes nothing, so it sends
// nothing either.
export async function sendSetPasswordLinkAction(): Promise<ActionResult<{ email: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: "Your session has ended. Sign in again first." };
    if (user.impersonatedBy) return { success: false, message: "This is a read-only support view of the account. Nothing can be changed from it." };
    await requestPasswordReset(user.email);
    return { success: true, data: { email: user.email } };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE };
    }
    return { success: false, message: "We couldn't send the link. Please try again." };
  }
}
