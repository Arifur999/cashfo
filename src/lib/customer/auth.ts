// Server-only helper (reads httpOnly cookies via next/headers). Not marked
// "use server" -- it's never invoked directly from a Client Component, only
// imported by other server-side code (layouts, pages, actions).

import { isAxiosError } from "axios";
import { cache } from "react";
import { logServiceError } from "@/lib/axios/logServiceError";
import { toRenderSafeError } from "@/lib/axios/renderSafeError";
import { getAccessToken } from "@/lib/tokenUtils";
import type { CurrentUser } from "./api";
import { customerApi } from "./apiClient";

// cache() dedupes this within a single request -- the customer layout and a
// page can both need the current user without each triggering its own round
// trip to the backend.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // customerApi adds the token, the visitor's headers and a timeout.
    const response = await customerApi.get<CurrentUser>("/api/auth/me");
    return response.data;
  } catch (error) {
    // 401/403: the backend no longer accepts this token -- a sign-out.
    // Anything else (backend down, 5xx) is an outage, shown as an error page
    // rather than a sign-in form the customer couldn't get past anyway.
    if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      return null;
    }
    logServiceError("Error fetching the current customer", error);
    // Into the layout's render: never the AxiosError and the token it carries.
    throw toRenderSafeError(error);
  }
});
