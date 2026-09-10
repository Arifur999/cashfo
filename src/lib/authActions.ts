"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "./api";
import { clearAuthCookies, getRefreshToken } from "./tokenCookies";

export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, { refreshToken });
    } catch {
      // Best-effort -- clear the local session regardless of whether the
      // backend call succeeded.
    }
  }
  await clearAuthCookies();
  redirect("/login");
}
