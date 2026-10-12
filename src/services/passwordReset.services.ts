import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import type { ICustomerSignInResponse, IResetPasswordPayload } from "@/types/auth.types";

// Customers reset their own password by email; admins' are reset by a super
// admin, so the backend never mails an admin a link.

// Answers the same whether or not the email has an account.
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email }, { headers: await getClientHeaders() });
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
    });
    return response.data;
  } catch (error) {
    logServiceError("Error resetting a password", error);
    throw error;
  }
};
