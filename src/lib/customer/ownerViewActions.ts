"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { clearAuthCookies, clearStashedAdminSession, getRefreshToken, getStashedAdminSession, setAuthCookies } from "@/lib/tokenUtils";
import { logout, refreshAccessToken } from "@/services/auth.services";
import { endOwnerView } from "@/services/ownerView.services";

// The banner's "End view": back to the owner's page in the admin panel with
// the admin's own session, which waited in a cookie (see
// viewAsCustomerAction). If that session is gone too, the view simply ends
// and the sign-in page follows.
export async function endOwnerViewAction(): Promise<void> {
  const stashed = await getStashedAdminSession();
  const adminAccessToken = stashed ? await refreshAccessToken(stashed.refreshToken, await headers()) : null;

  if (stashed && adminAccessToken) {
    try {
      await endOwnerView(stashed.ownerId, adminAccessToken);
    } catch {
      // The view runs out within the hour regardless.
    }
    await setAuthCookies(adminAccessToken, stashed.refreshToken);
    await clearStashedAdminSession();
    redirect(`/admin/users/${stashed.ownerId}`);
  }

  const viewRefreshToken = await getRefreshToken();
  if (viewRefreshToken) {
    try {
      await logout(viewRefreshToken);
    } catch {
      // Best effort, as for any logout.
    }
  }
  await clearAuthCookies();
  redirect(LOGIN_ROUTE);
}
