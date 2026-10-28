"use server";

import { customerApi } from "./apiClient";
import { callCodeApi, type CodeResult } from "./codeCall";

// A code the API sent, as the dialog shows it.
export interface PhoneCodeChallenge {
  challengeId: string;
  channel: "EMAIL" | "SMS";
  // Masked ("01712-•••678").
  sentTo: string;
  resendAfterSec: number;
  expiresAt: string;
  attemptsLeft: number;
  sendsLeft: number;
}

const id = (challengeId: string) => encodeURIComponent(challengeId);

// --- Settings > Profile: prove the phone is yours ---

// The account password first (left out for a Google-only account), then a
// code texted to the number on the profile.
export async function startPhoneVerifyAction(currentPassword?: string): Promise<CodeResult<PhoneCodeChallenge>> {
  return callCodeApi(
    async () => (await customerApi.post<PhoneCodeChallenge>("/api/auth/phone/verify/start", currentPassword ? { currentPassword } : {})).data,
    "We couldn't send the code. Please try again.",
  );
}

export async function resendPhoneVerifyAction(challengeId: string): Promise<CodeResult<PhoneCodeChallenge>> {
  return callCodeApi(
    async () => (await customerApi.post<PhoneCodeChallenge>(`/api/auth/phone/verify/start/${id(challengeId)}/resend`)).data,
    "We couldn't send the code. Please try again in a minute.",
  );
}

export async function confirmPhoneVerifyAction(challengeId: string, code: string): Promise<CodeResult<{ phone: string; phoneVerifiedAt: string }>> {
  return callCodeApi(async () => (await customerApi.post<{ phone: string; phoneVerifiedAt: string }>("/api/auth/phone/verify", { challengeId, code })).data, "We couldn't check the code. Please try again.");
}

// --- Forgot password by phone (no sign-in) ---

// An unknown number gets the same answer and no SMS, so the page can't tell
// who has an account.
export async function startPhoneResetAction(phone: string): Promise<CodeResult<PhoneCodeChallenge>> {
  return callCodeApi(async () => (await customerApi.post<PhoneCodeChallenge>("/api/auth/phone/reset/start", { phone })).data, "We couldn't send the code. Please try again.");
}

export async function resendPhoneResetAction(phone: string, challengeId: string): Promise<CodeResult<PhoneCodeChallenge>> {
  return callCodeApi(
    async () => (await customerApi.post<PhoneCodeChallenge>(`/api/auth/phone/reset/start/${id(challengeId)}/resend`, { phone })).data,
    "We couldn't send the code. Please try again in a minute.",
  );
}

// The right code answers a reset token for the usual "choose a new
// password" page.
export async function confirmPhoneResetAction(phone: string, challengeId: string, code: string): Promise<CodeResult<{ resetToken: string }>> {
  return callCodeApi(async () => (await customerApi.post<{ resetToken: string }>("/api/auth/phone/reset", { phone, challengeId, code })).data, "We couldn't check the code. Please try again.");
}
