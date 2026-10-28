import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import type { ICustomerSignInResponse, IResetPasswordPayload, ITwoStepPending } from "@/types/auth.types";

// A customer's emailed password reset. (An admin's has its own link and
// page: services/accountAccess.services.ts.)
//
// Every call gives up after 30 seconds, like every other call to the API, so
// a wedged API ends in "Unable to reach the server" instead of a busy button.
const TIMEOUT_MS = 30_000;

// Answers the same whether or not the email has an account.
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email }, { headers: await getClientHeaders(), timeout: TIMEOUT_MS });
  } catch (error) {
    logServiceError("Error requesting a password reset", error);
    throw error;
  }
};

// server-only, not "use server": a used link signs the customer in, so the
// answer carries tokens -- or, with two-step sign-in on, the code step still
// to come. Every other device is signed out.
export const resetPassword = async (payload: IResetPasswordPayload): Promise<ICustomerSignInResponse | ITwoStepPending> => {
  try {
    const response = await axios.post<ICustomerSignInResponse | ITwoStepPending>(`${API_BASE_URL}/api/auth/reset-password`, payload, {
      headers: await getClientHeaders(),
      timeout: TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    logServiceError("Error resetting a password", error);
    throw error;
  }
};

// The emailed code a reset needs when the customer turned on "Ask for a
// code before a password reset" (Settings > Security).
export interface ResetCodeChallenge {
  challengeId: string;
  channel: "EMAIL" | "SMS";
  // Masked ("ra****@example.com").
  sentTo: string;
  resendAfterSec: number;
  expiresAt: string;
  attemptsLeft: number;
  sendsLeft: number;
}

export const sendResetCode = async (token: string, resendChallengeId?: string): Promise<ResetCodeChallenge> => {
  const path = resendChallengeId ? `/api/auth/reset-password/code/${encodeURIComponent(resendChallengeId)}/resend` : "/api/auth/reset-password/code";
  const response = await axios.post<ResetCodeChallenge>(`${API_BASE_URL}${path}`, { token }, { headers: await getClientHeaders(), timeout: TIMEOUT_MS });
  return response.data;
};

export type ResetLinkStatus = "valid" | "invalid" | "unknown";

// Whether a reset link still works, asked without using it (GET
// /api/auth/reset-password/check), so an expired, used or superseded link
// says so before a new password is typed twice -- and whether it needs the
// emailed code too. Only a clear "no" counts: anything else -- maintenance,
// a slow or failed call -- shows the form as before, and saving checks the
// link anyway. The visitor's address goes along, as the check is throttled
// per client. Five seconds, not thirty: the page waits on it.
export const getResetLinkStatus = async (token: string): Promise<{ status: ResetLinkStatus; codeRequired: boolean }> => {
  try {
    const { data } = await axios.get<{ valid?: unknown; codeRequired?: unknown }>(`${API_BASE_URL}/api/auth/reset-password/check`, {
      params: { token },
      headers: await getClientHeaders(),
      timeout: 5000,
    });
    if (data?.valid === true) return { status: "valid", codeRequired: data.codeRequired === true };
    return { status: data?.valid === false ? "invalid" : "unknown", codeRequired: false };
  } catch {
    return { status: "unknown", codeRequired: false };
  }
};
