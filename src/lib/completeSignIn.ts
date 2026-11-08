import "server-only";
import type { ISignInResponse, ITwoStepPending, ITwoStepSignInResponse } from "@/types/auth.types";
import { homeRouteFor, safeRedirectPath } from "./authUtils";
import { type SignInStep, setAuthCookies, setSignInStep, setTrustedDevice } from "./tokenUtils";

// What the customer app says as it opens (Layout/ShellNotice.tsx, ?notice=).
export const ACCOUNT_RESTORED_NOTICE = "account-restored";

const withNotice = (path: string, notice: string) => `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}`;

// The last step of every sign-in (password, Google, the two-step code, a
// reset link): store the tokens -- and the 30-day trusted-computer token
// when there is one -- and pick where to go: the ?redirect= target when this
// account may open it, otherwise the home of its side (admin panel or
// customer app). `persist` false keeps them only until the browser closes.
// A customer lands with a notice: theirs (a changed password), or that
// signing in restored an account waiting to be deleted.
// Settings › App preferences › First page after sign-in.
const START_PAGES: Record<string, string> = { REPORTS: "/reports/detailed", INCOME_EXPENSE: "/income-expense", GROUP: "/group-expenses", CALENDAR: "/events" };

export const completeSignIn = async (answer: ISignInResponse & Partial<ITwoStepSignInResponse>, redirectTo?: string | null, persist = true, notice?: string): Promise<string> => {
  const { audience, accessToken, refreshToken, account } = answer;
  await setAuthCookies(accessToken, refreshToken, persist);
  if (answer.trustedDeviceToken) {
    await setTrustedDevice(account.id, answer.trustedDeviceToken, answer.trustedDeviceExpiresAt);
  }
  const destination = (redirectTo && safeRedirectPath(redirectTo, audience, account.role)) || (audience === "user" && START_PAGES[(account as { startPage?: string }).startPage ?? ""]) || homeRouteFor(audience);
  const landingNotice = answer.restoredFromDeletion ? ACCOUNT_RESTORED_NOTICE : notice;
  return audience === "user" && landingNotice ? withNotice(destination, landingNotice) : destination;
};

// What the page may know of a sign-in waiting on its second step: never the
// token itself, which stays in an httpOnly cookie.
export interface SignInStepView {
  kind: SignInStep["kind"];
  email: string;
  audience: SignInStep["audience"];
}

// A sign-in that answered with a step still to go (two-step sign-in): keeps
// the API's one-time token, and what the sign-in had chosen, for the step's
// own actions (app/(auth)/login/_twoStepAction.ts).
export const beginSignInStep = async (pending: ITwoStepPending, options: { persist?: boolean; redirectTo?: string | null; notice?: string } = {}): Promise<SignInStepView> => {
  const kind = "twoStepRequired" in pending ? "code" : "setup";
  const token = "twoStepRequired" in pending ? pending.challengeToken : pending.setupToken;
  await setSignInStep({
    kind,
    token,
    email: pending.email,
    audience: pending.audience,
    persist: options.persist !== false,
    ...(options.redirectTo && { redirectTo: options.redirectTo }),
    ...(options.notice && { notice: options.notice }),
  });
  return { kind, email: pending.email, audience: pending.audience };
};
