import "server-only";
import { isBetterAuthCookie } from "./betterAuthCookies";
import { deleteCookie, deleteCookiesWhere, getCookie, setCookie } from "./cookiesUtils";
import { jwtUtils } from "./jwtUtils";

// The cookie names are a contract with proxy.ts, which reads them on every
// page request. One pair for the whole site: an admin's and a customer's
// tokens live in the same cookies, and each token's `aud` says which it is.
// Keep every cookie/token touchpoint in this file.
export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

// Fallback lifetimes, used only when a token carries no readable `exp`. They
// must match the backend's JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN.
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// proxy.ts refreshes an access token once it has less than this left.
export const REFRESH_THRESHOLD_SECONDS = 60;

export const getTokenSecondsRemaining = (token: string): number => {
  const decoded = jwtUtils.decodeToken(token);
  if (typeof decoded?.exp !== "number") {
    return 0;
  }
  return decoded.exp - Math.floor(Date.now() / 1000);
};

export const isTokenExpiringSoon = (token: string, thresholdInSeconds = REFRESH_THRESHOLD_SECONDS): boolean =>
  getTokenSecondsRemaining(token) < thresholdInSeconds;

// Derives maxAge from the JWT itself so the cookie and the token it holds
// expire together, instead of the cookie outliving (or vanishing well before)
// the token.
export const setTokenInCookies = async (name: string, token: string, fallbackMaxAgeInSeconds: number) => {
  const remaining = getTokenSecondsRemaining(token);
  await setCookie(name, token, remaining > 0 ? remaining : fallbackMaxAgeInSeconds);
};

export const setAuthCookies = async (accessToken: string, refreshToken: string) => {
  await setTokenInCookies(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_MAX_AGE_SECONDS);
  await setTokenInCookies(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS);
};

// Also better-auth's own cookies from a Google sign-in, and the workspace
// unlocks. That session ended with the backend logout; this just leaves
// nothing stale behind.
export const clearAuthCookies = async () => {
  await deleteCookie(ACCESS_TOKEN_COOKIE);
  await deleteCookie(REFRESH_TOKEN_COOKIE);
  await deleteCookiesWhere((name) => isBetterAuthCookie(name) || isWorkspaceUnlockCookie(name));
};

export const getAccessToken = () => getCookie(ACCESS_TOKEN_COOKIE);

export const getRefreshToken = () => getCookie(REFRESH_TOKEN_COOKIE);

// A PIN-locked workspace opens with the unlock its PIN earns (backend:
// POST /api/businesses/:id/verify-pin), one cookie per workspace. The
// customer API client sends it with that workspace's requests.
const WORKSPACE_UNLOCK_COOKIE_PREFIX = "workspaceUnlock_";
// The backend's WORKSPACE_UNLOCK_TTL_SECONDS.
const WORKSPACE_UNLOCK_MAX_AGE_SECONDS = 12 * 60 * 60;

const workspaceUnlockCookie = (businessId: string) => `${WORKSPACE_UNLOCK_COOKIE_PREFIX}${businessId}`;
const isWorkspaceUnlockCookie = (name: string) => name.startsWith(WORKSPACE_UNLOCK_COOKIE_PREFIX);

export const setWorkspaceUnlock = (businessId: string, unlockToken: string) =>
  setTokenInCookies(workspaceUnlockCookie(businessId), unlockToken, WORKSPACE_UNLOCK_MAX_AGE_SECONDS);

export const getWorkspaceUnlock = (businessId: string) => getCookie(workspaceUnlockCookie(businessId));

export const clearWorkspaceUnlock = (businessId: string) => deleteCookie(workspaceUnlockCookie(businessId));

// Whether this device holds a live unlock for the workspace: unexpired and
// made in the current session. Decoded only, like everything here -- the
// backend checks the signature and the PIN it was made with.
export const hasWorkspaceUnlock = async (businessId: string): Promise<boolean> => {
  const [unlockToken, accessToken] = await Promise.all([getWorkspaceUnlock(businessId), getAccessToken()]);
  if (!unlockToken || !accessToken || getTokenSecondsRemaining(unlockToken) <= 0) {
    return false;
  }
  const sessionId = jwtUtils.decodeToken(accessToken)?.sid;
  return typeof sessionId === "string" && jwtUtils.decodeToken(unlockToken)?.sid === sessionId;
};
