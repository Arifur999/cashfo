"use server";

import { redirect } from "next/navigation";
import { LOGIN_ROUTE, MEMBER_LOGIN_ROUTE } from "@/lib/authUtils";
import { clearAuthCookies, getRefreshToken } from "@/lib/tokenUtils";
import { logout } from "@/services/auth.services";

// Cross-cutting (not tied to one route), so it lives in app/-actions.
// everywhere: the customer also leaves every other device (the sidebar's
// "Sign out on all my devices"); anything but true means this one only.
// to "member": back to the member sign-in page (a group member's portal
// login), not the main one.
export async function logoutAction(everywhere?: unknown, to?: unknown): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await logout(refreshToken, everywhere === true);
    } catch {
      // Best-effort revoke -- the local session is cleared regardless of
      // whether the backend call succeeded.
    }
  }
  await clearAuthCookies();
  // Outside any try/catch: redirect() works by throwing.
  redirect(to === "member" ? MEMBER_LOGIN_ROUTE : LOGIN_ROUTE);
}
