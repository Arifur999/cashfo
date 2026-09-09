// Server-only helper (reads httpOnly cookies via next/headers). Not marked
// "use server" -- it's never invoked directly from a Client Component, only
// imported by other server-side code (layouts, pages, actions), so it doesn't
// need to be a callable Server Action.

import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type AdminUser } from "./api";
import { getAccessToken } from "./tokenCookies";

// cache() dedupes this within a single request -- the dashboard layout and
// the dashboard page both need the current admin, and without this they'd
// each trigger their own round trip to the backend for the same request.
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<AdminUser>(`${API_BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    // Covers both "token invalid/expired" and "backend unreachable" -- either
    // way, treat the admin as not authenticated rather than surfacing a
    // low-level error to a page that's just trying to render a welcome message.
    return null;
  }
});
