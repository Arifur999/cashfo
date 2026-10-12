import "server-only";
import axios, { isAxiosError } from "axios";
import { cache } from "react";
import { clientHeaders, getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import { betterAuthCookies } from "@/lib/betterAuthCookies";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";
import type { IAdminUser, ISignInPayload, ISignInResponse, TokenAudience } from "@/types/auth.types";

// Not a "use server" module: signIn() and refreshAccessToken() return raw
// tokens, and every export of a "use server" file is a client-callable
// endpoint. They're only ever called from server code (actions, route
// handlers, proxy.ts, layouts), so `server-only` is the guard.
//
// Raw axios rather than httpClient: these run before a session exists
// (sign-in, refresh) or must stay independent of the session plumbing.

// Where each side's tokens are refreshed and ended.
const SESSION_ENDPOINTS: Record<TokenAudience, string> = {
  admin: `${API_BASE_URL}/admin/auth`,
  user: `${API_BASE_URL}/api/auth`,
};

// One sign-in for everyone: the answer's audience says which side it is.
export const signIn = async (payload: ISignInPayload): Promise<ISignInResponse> => {
  try {
    // The login throttle is per client IP, so this call above all must carry it.
    const response = await axios.post<ISignInResponse>(`${API_BASE_URL}/api/auth/sign-in`, payload, { headers: await getClientHeaders() });
    return response.data;
  } catch (error) {
    logServiceError("Error signing in", error);
    throw error;
  }
};

export type SessionExchangeResult = { ok: true; session: ISignInResponse } | { ok: false; reason: "suspended" | "failed" };

// The second half of Google sign-in: hands the backend the better-auth
// session cookie its callback just set, and gets the usual token pair back,
// bound to that same session, for whichever side the account belongs to.
// Never throws -- the caller only needs to know where to send the browser.
export const exchangeSession = async (requestHeaders: Pick<Headers, "get">): Promise<SessionExchangeResult> => {
  const cookie = betterAuthCookies(requestHeaders.get("cookie"));
  if (!cookie) {
    return { ok: false, reason: "failed" };
  }

  try {
    const response = await axios.post<ISignInResponse>(
      `${API_BASE_URL}/api/auth/session/sign-in`,
      {},
      { headers: { Cookie: cookie, ...clientHeaders(requestHeaders) } },
    );
    return { ok: true, session: response.data };
  } catch (error) {
    // 403: a real account, but suspended.
    if (isAxiosError(error) && error.response?.status === 403) {
      return { ok: false, reason: "suspended" };
    }
    logServiceError("Error exchanging a Google sign-in", error);
    return { ok: false, reason: "failed" };
  }
};

// Returns null instead of throwing: proxy.ts treats "refresh failed" as
// "signed out", whatever the reason. proxy.ts passes its own request's
// headers, since headers() isn't available there.
export const refreshAccessToken = async (refreshToken: string, requestHeaders: Pick<Headers, "get">): Promise<string | null> => {
  const audience = getTokenAudience(refreshToken);
  if (!audience) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string }>(
      `${SESSION_ENDPOINTS[audience]}/refresh`,
      { refreshToken },
      { headers: clientHeaders(requestHeaders) },
    );
    return response.data.accessToken;
  } catch {
    return null;
  }
};

export const logout = async (refreshToken: string): Promise<void> => {
  const audience = getTokenAudience(refreshToken);
  if (!audience) {
    // Nothing the backend would still accept, so nothing left to end.
    return;
  }

  try {
    await axios.post(`${SESSION_ENDPOINTS[audience]}/logout`, { refreshToken }, { headers: await getClientHeaders() });
  } catch (error) {
    logServiceError("Error logging out", error);
    throw error;
  }
};

// The signed-in admin. The dashboard layout, the sidebar and the page each
// need it in the same request; cache() turns that into one backend round
// trip shared by every caller -- without it each fires its own request, and
// any one of them can fail on its own (sidebar vanishes while the page
// renders fine).
export const getUserInfo = cache(async (): Promise<IAdminUser | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await axios.get<IAdminUser>(`${API_BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await getClientHeaders()) },
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
