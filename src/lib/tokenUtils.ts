import "server-only";
import { isBetterAuthCookie } from "./betterAuthCookies";
import { deleteCookie, deleteCookiesWhere, getAllCookies, getCookie, setCookie } from "./cookiesUtils";
import { jwtUtils } from "./jwtUtils";

// The cookie names are a contract with proxy.ts, which reads them on every
// page request. One pair for the whole site: an admin's and a customer's
// tokens live in the same cookies, and each token's `aud` says which it is.
// Keep every cookie/token touchpoint in this file.
export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
// Set while a sign-in chose not to stay signed in on this device: the
// tokens then live in browser-session cookies, refreshes included
// (proxy.ts), and are gone once the browser closes.
export const SESSION_ONLY_COOKIE = "sessionOnly";

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
export const setTokenInCookies = async (name: string, token: string, fallbackMaxAgeInSeconds: number, persist = true) => {
  const remaining = getTokenSecondsRemaining(token);
  await setCookie(name, token, persist ? (remaining > 0 ? remaining : fallbackMaxAgeInSeconds) : null);
};

// `persist` false: "Keep me signed in on this device" was left unticked.
export const setAuthCookies = async (accessToken: string, refreshToken: string, persist = true) => {
  await setTokenInCookies(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_MAX_AGE_SECONDS, persist);
  await setTokenInCookies(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS, persist);
  if (persist) await deleteCookie(SESSION_ONLY_COOKIE);
  else await setCookie(SESSION_ONLY_COOKIE, "1", null);
};

// Also better-auth's own cookies from a Google sign-in, the workspace
// unlocks and a waiting admin session. That session ended with the backend
// logout; this just leaves nothing stale behind.
export const clearAuthCookies = async () => {
  await deleteCookie(ACCESS_TOKEN_COOKIE);
  await deleteCookie(REFRESH_TOKEN_COOKIE);
  await deleteCookie(SESSION_ONLY_COOKIE);
  await deleteCookiesWhere((name) => isBetterAuthCookie(name) || isWorkspaceUnlockCookie(name));
  await clearStashedAdminSession();
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

// Every unlock this device holds, comma-joined for a call that reads across
// workspaces (the bell, Download my data): the backend keeps a PIN-locked
// workspace shut unless one of them opens it. Undefined when there are none.
export const getAllWorkspaceUnlocks = async (): Promise<string | undefined> => {
  const unlocks = (await getAllCookies()).filter((cookie) => isWorkspaceUnlockCookie(cookie.name) && cookie.value).map((cookie) => cookie.value);
  return unlocks.length > 0 ? unlocks.join(",") : undefined;
};

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

// "View as customer": while a super admin's cookies hold a customer's
// tokens, the admin's own refresh token waits here, with the customer it is
// about, so ending the view puts them back in the admin panel.
const STASHED_ADMIN_REFRESH_COOKIE = "viewAsAdminRefreshToken";
const VIEWED_OWNER_COOKIE = "viewAsOwnerId";

export const stashAdminSession = async (adminRefreshToken: string, ownerId: string) => {
  await setTokenInCookies(STASHED_ADMIN_REFRESH_COOKIE, adminRefreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS);
  await setCookie(VIEWED_OWNER_COOKIE, ownerId, getTokenSecondsRemaining(adminRefreshToken) || REFRESH_TOKEN_MAX_AGE_SECONDS);
};

export const getStashedAdminSession = async (): Promise<{ refreshToken: string; ownerId: string } | null> => {
  const [refreshToken, ownerId] = await Promise.all([getCookie(STASHED_ADMIN_REFRESH_COOKIE), getCookie(VIEWED_OWNER_COOKIE)]);
  return refreshToken && ownerId ? { refreshToken, ownerId } : null;
};

export const clearStashedAdminSession = async () => {
  await deleteCookie(STASHED_ADMIN_REFRESH_COOKIE);
  await deleteCookie(VIEWED_OWNER_COOKIE);
};

// "Don't ask again on this computer for 30 days": the token the two-step
// sign-in answers with, one cookie per account (trustedDevice_<account id>),
// so two people sharing a computer each keep theirs. Every sign-in sends
// them all (x-trusted-device); the API knows whose is whose. They outlive a
// sign-out on purpose -- the computer stays trusted until the 30 days end
// or the account removes it in Settings.
const TRUSTED_DEVICE_COOKIE_PREFIX = "trustedDevice_";
// The API reads at most this many.
const MAX_TRUSTED_DEVICE_TOKENS = 10;
const TRUSTED_DEVICE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const setTrustedDevice = async (accountId: string, token: string, expiresAt?: string) => {
  const seconds = expiresAt ? Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) : Number.NaN;
  await setCookie(`${TRUSTED_DEVICE_COOKIE_PREFIX}${accountId}`, token, Number.isFinite(seconds) && seconds > 0 ? seconds : TRUSTED_DEVICE_MAX_AGE_SECONDS);
};

const trustedDeviceHeaderOf = (tokens: string[]): Record<string, string> => {
  const kept = tokens.filter(Boolean).slice(0, MAX_TRUSTED_DEVICE_TOKENS);
  return kept.length > 0 ? { "x-trusted-device": kept.join(",") } : {};
};

// For Server Actions and Server Components.
export const getTrustedDeviceHeader = async (): Promise<Record<string, string>> =>
  trustedDeviceHeaderOf(
    (await getAllCookies()).filter((cookie) => cookie.name.startsWith(TRUSTED_DEVICE_COOKIE_PREFIX)).map((cookie) => cookie.value),
  );

// For a route handler, from its request's cookies.
export const trustedDeviceHeaderFrom = (cookieList: { name: string; value: string }[]): Record<string, string> =>
  trustedDeviceHeaderOf(cookieList.filter((cookie) => cookie.name.startsWith(TRUSTED_DEVICE_COOKIE_PREFIX)).map((cookie) => cookie.value));

// A sign-in waiting on its second step (the code, or an admin's two-step
// set-up): the API's one-time token and what the sign-in had chosen
// (keep me signed in, where to go), kept here rather than in the page, so
// the token never reaches the browser's script and a Google sign-in, which
// arrives by redirect, can hand it over too. It lasts as long as the API's
// set-up token (15 minutes); the code's own 5 minutes are the API's to keep.
const SIGN_IN_STEP_COOKIE = "signInStep";
const SIGN_IN_STEP_MAX_AGE_SECONDS = 15 * 60;

export interface SignInStep {
  kind: "code" | "setup";
  // The challengeToken (code) or the setupToken (set-up).
  token: string;
  email: string;
  audience: "admin" | "user";
  persist: boolean;
  redirectTo?: string;
  // Said by the customer app once signed in (ShellNotice).
  notice?: string;
}

export const setSignInStep = (step: SignInStep) => setCookie(SIGN_IN_STEP_COOKIE, JSON.stringify(step), SIGN_IN_STEP_MAX_AGE_SECONDS);

export const getSignInStep = async (): Promise<SignInStep | null> => {
  const raw = await getCookie(SIGN_IN_STEP_COOKIE);
  if (!raw) return null;
  try {
    const step = JSON.parse(raw) as Partial<SignInStep>;
    if ((step.kind === "code" || step.kind === "setup") && typeof step.token === "string" && typeof step.email === "string" && (step.audience === "admin" || step.audience === "user")) {
      return { kind: step.kind, token: step.token, email: step.email, audience: step.audience, persist: step.persist !== false, redirectTo: typeof step.redirectTo === "string" ? step.redirectTo : undefined, notice: typeof step.notice === "string" ? step.notice : undefined };
    }
  } catch {
    // A cookie this code didn't write: no step.
  }
  return null;
};

export const clearSignInStep = () => deleteCookie(SIGN_IN_STEP_COOKIE);
