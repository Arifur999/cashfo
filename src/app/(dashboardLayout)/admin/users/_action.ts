"use server";

import { redirect } from "next/navigation";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { getRefreshToken, setAuthCookies, stashAdminSession } from "@/lib/tokenUtils";
import { activateOwner, changeOwnerPlan, suspendOwner } from "@/services/owner.services";
import { startOwnerView } from "@/services/ownerView.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { changeOwnerPlanServerZodSchema, suspendOwnerServerZodSchema } from "@/zod/owner.validation";

export const suspendOwnerAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(suspendOwnerServerZodSchema, values, "Failed to suspend owner", (payload) => suspendOwner(userId, payload));

export const activateOwnerAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to activate owner", () => activateOwner(userId));

export const changeOwnerPlanAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(changeOwnerPlanServerZodSchema, values, "Failed to change plan", (payload) => changeOwnerPlan(userId, payload));

// "View as customer": the browser switches to a read-only session of the
// owner and lands in the customer app; the admin's own session waits in a
// cookie until the banner there ends the view. Only a failure comes back --
// success redirects, and the customer's tokens never reach the browser.
export const viewAsCustomerAction = async (userId: string): Promise<ApiErrorResponse | undefined> => {
  const invalid = requireId(userId, "owner");
  if (invalid) {
    return invalid;
  }
  const adminRefreshToken = await getRefreshToken();
  if (!adminRefreshToken) {
    return { success: false, message: "Your session has ended. Sign in again first." };
  }
  const started = await runAction("Failed to open the customer view", () => startOwnerView(userId));
  if (!started.success) {
    return started;
  }
  await stashAdminSession(adminRefreshToken, userId);
  await setAuthCookies(started.data.accessToken, started.data.refreshToken);
  redirect(CUSTOMER_HOME_ROUTE);
};
