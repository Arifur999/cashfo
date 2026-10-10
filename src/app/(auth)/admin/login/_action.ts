"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL, getApiErrorMessage, type LoginResponse } from "@/lib/api";
import { setAuthCookies } from "@/lib/tokenCookies";

export interface LoginActionResult {
  success: false;
  message: string;
}

export async function loginAction(email: string, password: string): Promise<LoginActionResult | void> {
  try {
    const response = await axios.post<LoginResponse>(`${API_BASE_URL}/admin/auth/login`, { email, password });
    await setAuthCookies(response.data.accessToken, response.data.refreshToken);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // error.response only exists if the backend actually answered (e.g. a
      // 401 for bad credentials). No response at all means the request never
      // reached the backend -- report that distinctly instead of defaulting
      // to "Invalid email or password", which would be misleading.
      if (!error.response) {
        return { success: false, message: "Unable to reach the server. Is the backend running?" };
      }
      return { success: false, message: getApiErrorMessage(error.response.data, "Invalid email or password") };
    }
    return { success: false, message: "Unable to reach the server" };
  }

  // Outside the try/catch -- redirect() throws internally and must not be
  // swallowed by the catch block above.
  redirect("/admin/dashboard");
}
