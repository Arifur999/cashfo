// Server-only helper (reads httpOnly cookies via next/headers). Not marked
// "use server" -- it's never invoked directly from a Client Component, only
// imported by other server-side code (layouts, pages, actions).

import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type CurrentUser } from "./api";
import { getAccessToken } from "./tokenCookies";

// cache() dedupes this within a single request -- the (dashboard) layout and
// a page can both need the current user without each triggering its own
// round trip to the backend.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<CurrentUser>(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    // Covers both "token invalid/expired" and "backend unreachable" -- either
    // way, treat the user as not authenticated rather than surfacing a
    // low-level error to a page that's just trying to render a welcome message.
    return null;
  }
});
