"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL, getApiErrorMessage, type AuthResponse, type LanguagePreference } from "@/lib/api";
import { clientRequestHeaders } from "@/lib/clientContext";
import { setAuthCookies } from "@/lib/tokenCookies";

export interface RegisterActionResult {
  success: false;
  message: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  preferredLanguage: LanguagePreference;
}

export async function registerAction(input: RegisterInput): Promise<RegisterActionResult | void> {
  try {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/register`, input, { headers: await clientRequestHeaders() });
    await setAuthCookies(response.data.accessToken, response.data.refreshToken);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return { success: false, message: "Unable to reach the server. Is the backend running?" };
      }
      return { success: false, message: getApiErrorMessage(error.response.data, "Could not create your account") };
    }
    return { success: false, message: "Unable to reach the server" };
  }

  // Outside the try/catch -- redirect() throws internally and must not be
  // swallowed by the catch block above.
  redirect("/dashboard");
}
