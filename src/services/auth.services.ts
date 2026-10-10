import "server-only";
import axios from "axios";
import { cache } from "react";
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
    const response = await axios.post<ILoginResponse>(`${API_BASE_URL}/admin/auth/login`, payload);
    return response.data;
  } catch (error) {
    logServiceError("Error logging in", error);
    throw error;
  }
};

// Returns null instead of throwing: proxy.ts treats "refresh failed" as
// "signed out", whatever the reason.
export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await axios.post<{ accessToken: string }>(`${API_BASE_URL}/admin/auth/refresh`, { refreshToken });
    return response.data.accessToken;
  } catch {
    return null;
  }
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/admin/auth/logout`, { refreshToken });
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
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    // Covers both "token invalid/expired" and "backend unreachable" -- either
    // way the admin is treated as signed out rather than surfacing a
    // low-level error to a page that only wanted a name and a role.
    return null;
  }
});
