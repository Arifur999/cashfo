"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL, getApiErrorMessage, type AuthResponse } from "@/lib/api";
import { clientRequestHeaders } from "@/lib/clientContext";
import { setAuthCookies } from "@/lib/tokenCookies";

export interface LoginActionResult {
  success: false;
  message: string;
}

export async function loginAction(email: string, password: string): Promise<LoginActionResult | void> {
  try {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/login`, { email, password }, { headers: await clientRequestHeaders() });
    await setAuthCookies(response.data.accessToken, response.data.refreshToken);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // error.response only exists if the backend actually answered (e.g. a
      // 401 for bad credentials, 403 for a suspended account). No response
      // at all means the request never reached the backend.
      if (!error.response) {
        return { success: false, message: "Unable to reach the server. Is the backend running?" };
      }
      return { success: false, message: getApiErrorMessage(error.response.data, "Invalid email or password") };
    }
    return { success: false, message: "Unable to reach the server" };
  }

  // Outside the try/catch -- redirect() throws internally and must not be
  // swallowed by the catch block above.
  redirect("/dashboard");
}
