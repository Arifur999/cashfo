"use server";

import { redirect } from "next/navigation";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { clearAuthCookies, getRefreshToken } from "@/lib/tokenUtils";
import { logout } from "@/services/auth.services";

// Cross-cutting (not tied to one route), so it lives in app/-actions.
export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await logout(refreshToken);
    } catch {
      // Best-effort revoke -- the local session is cleared regardless of
      // whether the backend call succeeded.
    }
  }
  await clearAuthCookies();
  // Outside any try/catch: redirect() works by throwing.
  redirect(LOGIN_ROUTE);
}
