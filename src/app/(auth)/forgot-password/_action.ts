"use server";

import { toActionError } from "@/lib/actionError";
import { requestPasswordReset } from "@/services/passwordReset.services";
import type { ApiResult } from "@/types/api.types";
import { forgotPasswordServerZodSchema } from "@/zod/auth.validation";

// Succeeds the same way whether or not the email has an account, so the
// page can't be used to find out who is registered.
export const requestPasswordResetAction = async (values: unknown): Promise<ApiResult<null>> => {
  const parsed = forgotPasswordServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  try {
    await requestPasswordReset(parsed.data.email);
    return { success: true, message: "Reset link sent", data: null };
  } catch (error) {
    return toActionError(error, "We couldn't send the link. Please try again.");
  }
};
