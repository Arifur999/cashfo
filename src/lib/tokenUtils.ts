import "server-only";
import { deleteCookie, getCookie, setCookie } from "./cookiesUtils";
import { jwtUtils } from "./jwtUtils";

// The cookie names are a contract with proxy.ts, which reads them on every
// /admin request. Keep every cookie/token touchpoint in this file so swapping
// the session mechanism (e.g. to better-auth) stays a contained change.
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

export const clearAuthCookies = async () => {
  await deleteCookie(ACCESS_TOKEN_COOKIE);
  await deleteCookie(REFRESH_TOKEN_COOKIE);
};

export const getAccessToken = () => getCookie(ACCESS_TOKEN_COOKIE);

export const getRefreshToken = () => getCookie(REFRESH_TOKEN_COOKIE);
