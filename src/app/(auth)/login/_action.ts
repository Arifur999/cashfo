"use server";

import { redirect } from "next/navigation";
import { toActionError } from "@/lib/actionError";
import { completeSignIn } from "@/lib/completeSignIn";
import { signIn } from "@/services/auth.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { loginServerZodSchema } from "@/zod/auth.validation";

// Resolves only on failure: success sets the cookies and redirects, to the
// admin panel or the customer app depending on who signed in.
export const signInAction = async (values: unknown, redirectTo?: string): Promise<ApiErrorResponse> => {
  const parsed = loginServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid email or password" };
  }

  let destination: string;
  try {
    destination = await completeSignIn(await signIn(parsed.data), redirectTo);
  } catch (error) {
    return toActionError(error, "Invalid email or password");
  }

  // Outside the try/catch: redirect() throws NEXT_REDIRECT, which the catch
  // would otherwise swallow and leave the person on a dead form.
  redirect(destination);
};
