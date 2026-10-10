"use server";

import { redirect } from "next/navigation";
import { toActionError } from "@/lib/actionError";
import { DEFAULT_DASHBOARD_ROUTE, isValidRedirectForRole } from "@/lib/authUtils";
import { setAuthCookies } from "@/lib/tokenUtils";
import { login } from "@/services/auth.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { loginServerZodSchema } from "@/zod/auth.validation";

// Resolves only on failure: success sets the cookies and redirects, to the
// ?redirect= target when it's one this admin's role may open.
export const loginAction = async (values: unknown, redirectTo?: string): Promise<ApiErrorResponse> => {
  const parsed = loginServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid email or password" };
  }

  let destination = DEFAULT_DASHBOARD_ROUTE;
  try {
    const { accessToken, refreshToken, adminUser } = await login(parsed.data);
    await setAuthCookies(accessToken, refreshToken);
    if (redirectTo && isValidRedirectForRole(redirectTo, adminUser.role)) {
      destination = redirectTo;
    }
  } catch (error) {
    return toActionError(error, "Invalid email or password");
  }

  // Outside the try/catch: redirect() throws NEXT_REDIRECT, which the catch
  // would otherwise swallow and leave the admin on a dead form.
  redirect(destination);
};
