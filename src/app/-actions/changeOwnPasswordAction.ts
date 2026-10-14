"use server";

import { runValidatedAction } from "@/lib/runAction";
import { changeOwnPassword } from "@/services/adminAccount.services";
import { changeOwnPasswordServerZodSchema } from "@/zod/auth.validation";

// Cross-cutting (the account menu on every admin page), so it lives here.
export const changeOwnPasswordAction = async (values: unknown) =>
  runValidatedAction(changeOwnPasswordServerZodSchema, values, "Failed to change your password", (payload) => changeOwnPassword(payload));
