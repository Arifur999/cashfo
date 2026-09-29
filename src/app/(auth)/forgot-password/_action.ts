"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import { clientRequestHeaders } from "@/lib/clientContext";

export interface ForgotPasswordActionResult {
  success: boolean;
  message?: string;
}

export async function forgotPasswordAction(email: string): Promise<ForgotPasswordActionResult> {
  try {
    await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email }, { headers: await clientRequestHeaders() });
    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return { success: false, message: "Unable to reach the server. Is the backend running?" };
      }
      return { success: false, message: getApiErrorMessage(error.response.data, "Something went wrong. Please try again.") };
    }
    return { success: false, message: "Unable to reach the server" };
  }
}
