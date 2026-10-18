import "server-only";
import type { ISignInResponse } from "@/types/auth.types";
import { homeRouteFor, safeRedirectPath } from "./authUtils";
import { setAuthCookies } from "./tokenUtils";

// The last step of every sign-in (password or Google): store the tokens and
// pick where to go -- the ?redirect= target when this account may open it,
// otherwise the home of its side (admin panel or customer app). `persist`
// false keeps them only until the browser closes.
export const completeSignIn = async (
  { audience, accessToken, refreshToken, account }: ISignInResponse,
  redirectTo?: string | null,
  persist = true,
): Promise<string> => {
  await setAuthCookies(accessToken, refreshToken, persist);
  return (redirectTo && safeRedirectPath(redirectTo, audience, account.role)) || homeRouteFor(audience);
};
