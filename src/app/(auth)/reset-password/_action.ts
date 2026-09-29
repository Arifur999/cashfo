"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL, getApiErrorMessage, type AuthResponse } from "@/lib/api";
import { clientRequestHeaders } from "@/lib/clientContext";
import { setAuthCookies } from "@/lib/tokenCookies";

export interface ResetPasswordActionResult {
  success: false;
  message: string;
}

export async function resetPasswordAction(token: string, newPassword: string): Promise<ResetPasswordActionResult | void> {
  try {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/api/auth/reset-password`,
      { token, newPassword },
      { headers: await clientRequestHeaders() },
    );
    await setAuthCookies(response.data.accessToken, response.data.refreshToken);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return { success: false, message: "Unable to reach the server. Is the backend running?" };
      }
      return { success: false, message: getApiErrorMessage(error.response.data, "This reset link is invalid or has expired.") };
    }
    return { success: false, message: "Unable to reach the server" };
  }

  // Outside the try/catch -- redirect() throws internally and must not be
  // swallowed by the catch block above.
  redirect("/dashboard");
}
