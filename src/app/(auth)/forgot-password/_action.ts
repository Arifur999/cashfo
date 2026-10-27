"use server";

import { isAxiosError } from "axios";
import { toActionError } from "@/lib/actionError";
import { requestAdminPasswordReset } from "@/services/accountAccess.services";
import { requestPasswordReset } from "@/services/passwordReset.services";
import type { ApiResult } from "@/types/api.types";
import { forgotPasswordServerZodSchema } from "@/zod/auth.validation";

// One "Forgot password?" for the whole site, as sign-in is one: the email
// goes to both sides' reset (customers get the app's link, admins the admin
// panel's), and each answers the same whether or not it knows the email --
// so the page can't be used to find out who is registered, or who is an
// admin.
export const requestPasswordResetAction = async (values: unknown): Promise<ApiResult<null>> => {
  const parsed = forgotPasswordServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const [customer, admin] = await Promise.allSettled([requestPasswordReset(parsed.data.email), requestAdminPasswordReset(parsed.data.email)]);
  // The customers' limit (3 in 15 minutes) is the one a resend runs into:
  // say so rather than claim a link went out.
  if (customer.status === "rejected" && isAxiosError(customer.reason) && customer.reason.response?.status === 429) {
    return toActionError(customer.reason, "We couldn't send the link. Please try again.");
  }
  if (customer.status === "fulfilled" || admin.status === "fulfilled") {
    return { success: true, message: "Reset link sent", data: null };
  }
  return toActionError(customer.reason, "We couldn't send the link. Please try again.");
};
