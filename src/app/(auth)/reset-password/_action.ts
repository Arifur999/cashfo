"use server";

import { redirect } from "next/navigation";
import { toActionError } from "@/lib/actionError";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { setAuthCookies } from "@/lib/tokenUtils";
import { resetPassword } from "@/services/passwordReset.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { resetPasswordServerZodSchema } from "@/zod/auth.validation";

// Resolves only on failure: a used link signs the customer in on this
// device (and out everywhere else), then opens the customer app.
export const resetPasswordAction = async (values: unknown): Promise<ApiErrorResponse> => {
  const parsed = resetPasswordServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  try {
    const { accessToken, refreshToken } = await resetPassword(parsed.data);
    await setAuthCookies(accessToken, refreshToken);
  } catch (error) {
    return toActionError(error, "We couldn't save your new password. Please try again.");
  }

  redirect(CUSTOMER_HOME_ROUTE);
};
