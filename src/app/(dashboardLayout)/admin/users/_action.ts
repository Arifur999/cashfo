"use server";

import { redirect } from "next/navigation";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { getRefreshToken, setAuthCookies, stashAdminSession } from "@/lib/tokenUtils";
import { activateOwner, addOwnerNote, changeOwnerPlan, deleteOwnerNote, disableOwnerTwoStep, resetOwnerPassword, restoreOwner, signOutOwnerEverywhere, suspendOwner } from "@/services/owner.services";
import { startOwnerView } from "@/services/ownerView.services";
import type { ApiErrorResponse } from "@/types/api.types";
import { changeOwnerPlanServerZodSchema, ownerNoteZodSchema, suspendOwnerServerZodSchema } from "@/zod/owner.validation";

export const suspendOwnerAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(suspendOwnerServerZodSchema, values, "Failed to suspend owner", (payload) => suspendOwner(userId, payload));

export const activateOwnerAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to activate owner", () => activateOwner(userId));

export const resetOwnerPasswordAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to reset the password", () => resetOwnerPassword(userId));

export const changeOwnerPlanAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(changeOwnerPlanServerZodSchema, values, "Failed to change plan", (payload) => changeOwnerPlan(userId, payload));

export const restoreOwnerAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to cancel the deletion", () => restoreOwner(userId));

export const signOutOwnerEverywhereAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to sign them out", () => signOutOwnerEverywhere(userId));

export const disableOwnerTwoStepAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to turn off two-step verification", () => disableOwnerTwoStep(userId));

export const addOwnerNoteAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ?? runValidatedAction(ownerNoteZodSchema, values, "Failed to save the note", (payload) => addOwnerNote(userId, payload));

export const deleteOwnerNoteAction = async (userId: string, noteId: string) =>
  requireId(userId, "owner") ?? requireId(noteId, "note") ?? runAction("Failed to remove the note", () => deleteOwnerNote(userId, noteId));

// "View as customer": the browser switches to a read-only session of the
// owner and lands in the customer app; the admin's own session waits in a
// cookie until the banner there ends the view. Only a failure comes back --
// success redirects, and the customer's tokens never reach the browser.
// It needs the 6-digit support code the customer made for it.
export const viewAsCustomerAction = async (userId: string, code: unknown): Promise<ApiErrorResponse | undefined> => {
  const invalid = requireId(userId, "owner");
  if (invalid) {
    return invalid;
  }
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    return { success: false, message: "Enter the 6-digit support code the customer gave you" };
  }
  const adminRefreshToken = await getRefreshToken();
  if (!adminRefreshToken) {
    return { success: false, message: "Your session has ended. Sign in again first." };
  }
  const started = await runAction("Failed to open the customer view", () => startOwnerView(userId, code.trim()));
  if (!started.success) {
    return started;
  }
  await stashAdminSession(adminRefreshToken, userId);
  await setAuthCookies(started.data.accessToken, started.data.refreshToken);
  redirect(CUSTOMER_HOME_ROUTE);
};
