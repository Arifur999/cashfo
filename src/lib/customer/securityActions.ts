"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { getTrustedDeviceHeader } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage, type DisplayPreferences, type SecurityAlerts } from "./api";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";
import type { DeletionPreview, TwoStepStatus } from "./securityDisplay";

// Settings' newer account calls: two-step sign-in, the security alerts,
// email verification, the display preferences and deleting the account.
// Each answer keeps the API's own reason for a refusal (CODE_WRONG,
// RECENT_SIGN_IN_REQUIRED...) so the dialogs can say exactly what to do.
export interface SecurityResult<T = void> extends ActionResult<T> {
  reason?: string;
  status?: number;
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<SecurityResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = (error.response?.data ?? {}) as { reason?: unknown };
      const status = error.response?.status;
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      // Nest's throttler answers with its own class name: the app's words instead.
      if (status === 429 && !reason) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE, reason: "THROTTLED", status };
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage), ...(reason && { reason }), ...(status && { status }) };
    }
    return { success: false, message: fallbackMessage };
  }
}

// The trustedDevice_<accountId> cookies this browser holds (set by the
// two-step sign-in), so the API can tell which trusted computer is this one.
const trustedDeviceHeader = getTrustedDeviceHeader;

// ---- Two-step sign-in ----

export async function getTwoStepStatusAction(): Promise<SecurityResult<TwoStepStatus>> {
  return callApi(async () => (await customerApi.get<TwoStepStatus>(`${API_BASE_URL}/api/auth/two-step`, { headers: await trustedDeviceHeader() })).data, "Couldn't load two-step sign-in");
}

// A new secret for the authenticator app; the password confirms it is the
// owner (a Google-only account leaves it out and needs a recent sign-in).
export async function startTwoStepSetupAction(password?: string): Promise<SecurityResult<{ secret: string; otpauthUrl: string }>> {
  return callApi(async () => (await customerApi.post(`${API_BASE_URL}/api/auth/two-step/setup`, password ? { password } : {})).data, "Couldn't start the set-up");
}

export async function enableTwoStepAction(code: string): Promise<SecurityResult<{ backupCodes: string[] }>> {
  return callApi(async () => (await customerApi.post(`${API_BASE_URL}/api/auth/two-step/enable`, { code })).data, "Couldn't turn on two-step sign-in");
}

export async function regenerateBackupCodesAction(input: { password?: string; code: string }): Promise<SecurityResult<{ backupCodes: string[] }>> {
  const body = { code: input.code, ...(input.password && { password: input.password }) };
  return callApi(async () => (await customerApi.post(`${API_BASE_URL}/api/auth/two-step/backup-codes`, body)).data, "Couldn't make new backup codes");
}

export async function disableTwoStepAction(input: { password?: string; code?: string; backupCode?: string }): Promise<SecurityResult> {
  const body = { ...(input.password && { password: input.password }), ...(input.code && { code: input.code }), ...(input.backupCode && { backupCode: input.backupCode }) };
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/auth/two-step/disable`, body);
  }, "Couldn't turn off two-step sign-in");
}

export async function removeTrustedDeviceAction(id: string): Promise<SecurityResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/auth/two-step/trusted-devices/${encodeURIComponent(id)}`);
  }, "Couldn't remove that computer");
}

export async function removeAllTrustedDevicesAction(): Promise<SecurityResult<{ removed: number }>> {
  return callApi(async () => (await customerApi.delete<{ removed: number }>(`${API_BASE_URL}/api/auth/two-step/trusted-devices`)).data, "Couldn't remove the computers");
}

// ---- Alerts and email ----

export async function getSecurityAlertsAction(): Promise<SecurityResult<SecurityAlerts>> {
  return callApi(async () => (await customerApi.get<SecurityAlerts>(`${API_BASE_URL}/api/auth/alerts`)).data, "Couldn't load your alerts");
}

export async function saveSecurityAlertsAction(changes: Partial<Omit<SecurityAlerts, "emailReady">>): Promise<SecurityResult<SecurityAlerts>> {
  const { alertNewDevice, alertFailedTries, askCodeBeforeReset } = changes;
  const body = { ...(alertNewDevice !== undefined && { alertNewDevice }), ...(alertFailedTries !== undefined && { alertFailedTries }), ...(askCodeBeforeReset !== undefined && { askCodeBeforeReset }) };
  return callApi(async () => (await customerApi.patch<SecurityAlerts>(`${API_BASE_URL}/api/auth/alerts`, body)).data, "Couldn't save your alerts");
}

export async function sendVerificationEmailAction(): Promise<SecurityResult<{ alreadyVerified?: boolean; sent?: boolean; sentTo?: string; expiresAt?: string }>> {
  return callApi(async () => (await customerApi.post(`${API_BASE_URL}/api/auth/verify-email/send`, {})).data, "We couldn't send the verification email. Please try again in a minute.");
}

// ---- Display preferences ----

export async function savePreferencesAction(changes: Partial<DisplayPreferences>): Promise<SecurityResult<DisplayPreferences>> {
  return callApi(async () => (await customerApi.patch<DisplayPreferences>(`${API_BASE_URL}/api/auth/preferences`, changes)).data, "Couldn't save your preference");
}

// ---- Delete my account ----

export async function getDeletionPreviewAction(): Promise<SecurityResult<DeletionPreview>> {
  return callApi(async () => (await customerApi.get<DeletionPreview>(`${API_BASE_URL}/api/account/delete/preview`)).data, "Couldn't load what would be deleted");
}

export async function deleteAccountAction(input: { password?: string; code?: string; backupCode?: string }): Promise<SecurityResult<{ scheduledFor: string }>> {
  const body = { confirm: "DELETE", ...(input.password && { password: input.password }), ...(input.code && { code: input.code }), ...(input.backupCode && { backupCode: input.backupCode }) };
  return callApi(async () => (await customerApi.post<{ scheduledFor: string }>(`${API_BASE_URL}/api/account/delete`, body)).data, "Couldn't delete your account");
}

// Settings › Security › Recovery email: the address and the account's
// password (none for a Google-only account) send a code to it; the code
// saves it.
export interface RecoveryChallenge {
  challengeId: string;
  sentTo: string;
  resendAfterSec: number;
}

export async function startRecoveryEmailAction(input: { email: string; password?: string }): Promise<SecurityResult<RecoveryChallenge>> {
  return callApi(async () => (await customerApi.post<RecoveryChallenge>("/api/auth/recovery-email", input)).data, "Couldn't send the code. Try again.");
}

export async function confirmRecoveryEmailAction(input: { challengeId: string; code: string }): Promise<SecurityResult<{ recoveryEmail: string | null }>> {
  return callApi(async () => (await customerApi.post<{ recoveryEmail: string | null }>("/api/auth/recovery-email/confirm", input)).data, "That code didn't work. Try again.");
}

export async function removeRecoveryEmailAction(): Promise<SecurityResult<{ recoveryEmail: null }>> {
  return callApi(async () => (await customerApi.delete<{ recoveryEmail: null }>("/api/auth/recovery-email")).data, "Couldn't remove the recovery email.");
}
