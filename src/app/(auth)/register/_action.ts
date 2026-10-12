"use server";

import { redirect } from "next/navigation";
import { toActionError } from "@/lib/actionError";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { setAuthCookies } from "@/lib/tokenUtils";
import { register } from "@/services/registration.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { registerServerZodSchema } from "@/zod/auth.validation";

// Resolves only on failure: the new account is signed in straight away and
// lands in the customer app.
export const registerAction = async (values: unknown): Promise<ApiErrorResponse> => {
  const parsed = registerServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  try {
    const { accessToken, refreshToken } = await register(parsed.data);
    await setAuthCookies(accessToken, refreshToken);
  } catch (error) {
    return toActionError(error, "We couldn't create your account. Please try again.");
  }

  redirect(CUSTOMER_HOME_ROUTE);
};
