import "server-only";
import axios, { isAxiosError } from "axios";
import { cache } from "react";
import { forwardedForHeader, getForwardedForHeader } from "@/lib/axios/forwardedFor";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import { getAccessToken } from "@/lib/tokenUtils";
import type { IAdminUser, ILoginPayload, ILoginResponse } from "@/types/auth.types";

// The one service that is NOT a "use server" module. login() and
// refreshAccessToken() return raw tokens, and every export of a "use server"
// file is a client-callable endpoint. They're only ever called from server
// code (the login action, proxy.ts, layouts), so `server-only` is the guard.
//
// Raw axios rather than httpClient: these run before a session exists (login,
// refresh) or must stay independent of the session plumbing (getUserInfo).

export const login = async (payload: ILoginPayload): Promise<ILoginResponse> => {
  try {
    // The login throttle is per client IP, so this call above all must carry it.
    const response = await axios.post<ILoginResponse>(`${API_BASE_URL}/admin/auth/login`, payload, { headers: await getForwardedForHeader() });
    return response.data;
  } catch (error) {
    logServiceError("Error logging in", error);
    throw error;
  }
};

// Returns null instead of throwing: proxy.ts treats "refresh failed" as
// "signed out", whatever the reason. proxy.ts passes its request's
// X-Forwarded-For, since headers() isn't available there.
export const refreshAccessToken = async (refreshToken: string, forwardedFor?: string | null): Promise<string | null> => {
  try {
    const response = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/admin/auth/refresh`,
      { refreshToken },
      { headers: forwardedForHeader(forwardedFor) },
    );
    return response.data.accessToken;
  } catch {
    return null;
  }
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/admin/auth/logout`, { refreshToken }, { headers: await getForwardedForHeader() });
  } catch (error) {
    logServiceError("Error logging out", error);
    throw error;
  }
};

// The dashboard layout, the sidebar and the page each need the current admin
// in the same request. cache() turns that into one backend round trip shared
// by every caller -- without it each fires its own request, and any one of
// them can fail on its own (sidebar vanishes while the page renders fine).
export const getUserInfo = cache(async (): Promise<IAdminUser | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await axios.get<IAdminUser>(`${API_BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await getForwardedForHeader()) },
    });
    return response.data;
  } catch (error) {
    // 401/403: the backend no longer accepts this token (admin deleted,
    // secret rotated) -- that's a sign-out. Anything else (backend down, 5xx)
    // is an outage, and must surface as an error page rather than bounce the
    // admin to a login form they couldn't get past anyway.
    if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      return null;
    }
    logServiceError("Error fetching the current admin", error);
    throw error;
  }
});
