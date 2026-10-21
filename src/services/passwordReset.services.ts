import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import type { ICustomerSignInResponse, IResetPasswordPayload } from "@/types/auth.types";

// Customers reset their own password by email; admins' are reset by a super
// admin, so the backend never mails an admin a link.
//
// Both calls give up after 30 seconds, like every other call to the API, so
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
// answer carries tokens. Every other device is signed out.
export const resetPassword = async (payload: IResetPasswordPayload): Promise<ICustomerSignInResponse> => {
  try {
    const response = await axios.post<ICustomerSignInResponse>(`${API_BASE_URL}/api/auth/reset-password`, payload, {
      headers: await getClientHeaders(),
      timeout: TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    logServiceError("Error resetting a password", error);
    throw error;
  }
};

export type ResetLinkStatus = "valid" | "invalid" | "unknown";

// Whether a reset link still works, asked without using it (GET
// /api/auth/reset-password/check), so an expired, used or superseded link
// says so before a new password is typed twice. Only a clear "no" counts:
// anything else -- an API without the route yet, maintenance, a slow or
// failed call -- shows the form as before, and saving checks the link anyway.
// The visitor's address goes along, as the check is throttled per client.
// Five seconds, not thirty: the page waits on it.
export const getResetLinkStatus = async (token: string): Promise<ResetLinkStatus> => {
  try {
    const { data } = await axios.get<{ valid?: unknown }>(`${API_BASE_URL}/api/auth/reset-password/check`, {
      params: { token },
      headers: await getClientHeaders(),
      timeout: 5000,
    });
    if (data?.valid === true) return "valid";
    return data?.valid === false ? "invalid" : "unknown";
  } catch {
    return "unknown";
  }
};
