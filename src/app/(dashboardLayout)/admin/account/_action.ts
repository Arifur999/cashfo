"use server";

import { isAxiosError } from "axios";
import { toActionError } from "@/lib/actionError";
import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import {
  disableMyTwoStep,
  enableMyTwoStep,
  forgetMyTrustedDevice,
  forgetMyTrustedDevices,
  getMyTwoStep,
  makeMyBackupCodes,
  signOutMyOtherSessions,
  startMyTwoStepSetup,
  updateMyName,
} from "@/services/myAccount.services";
import type { ApiResponse, ApiResult } from "@/types/api.types";
import type { ITwoStepFailure } from "@/types/myAccount.types";
import { myNameFormZodSchema } from "@/zod/myAccount.validation";

export const updateMyNameAction = async (values: unknown) =>
  runValidatedAction(myNameFormZodSchema, values, "Failed to save your name", ({ name }) => updateMyName(name));

export const signOutOtherDevicesAction = async () => runAction("Failed to sign out your other devices", () => signOutMyOtherSessions());

// ---- Two-step sign-in for the admin's own account ----

// Like runAction, but a refusal keeps the API's reason (CODE_WRONG...), so
// the dialog can say exactly what to do.
const runTwoStep = async <TData>(fallbackMessage: string, run: () => Promise<ApiResponse<TData>>): Promise<ApiResult<TData> | ITwoStepFailure> => {
  try {
    return await run();
  } catch (error) {
    const failure = toActionError(error, fallbackMessage);
    const body = isAxiosError(error) ? (error.response?.data as { reason?: unknown } | undefined) : undefined;
    return typeof body?.reason === "string" ? { ...failure, reason: body.reason } : failure;
  }
};

const text = (value: unknown, max = 128) => (typeof value === "string" && value.length <= max ? value : "");
const SIX_DIGITS = /^\d{6}$/;
const BACKUP_CODE = /^[a-z0-9]{4}-?[a-z0-9]{4}$/i;

export const getMyTwoStepAction = async () => runAction("Couldn't load two-step verification", () => getMyTwoStep());

export const startMyTwoStepAction = async (password: unknown) => {
  const value = text(password);
  if (!value) return { success: false as const, message: "Enter your password" };
  return runTwoStep("Couldn't start the set-up", () => startMyTwoStepSetup(value));
};

export const enableMyTwoStepAction = async (code: unknown) => {
  const value = text(code);
  if (!SIX_DIGITS.test(value)) return { success: false as const, message: "Enter the 6-digit code from the app" };
  return runTwoStep("Couldn't turn on two-step verification", () => enableMyTwoStep(value));
};

export const makeMyBackupCodesAction = async (password: unknown, code: unknown) => {
  const pass = text(password);
  const value = text(code);
  if (!pass) return { success: false as const, message: "Enter your password" };
  if (!SIX_DIGITS.test(value)) return { success: false as const, message: "Enter the 6-digit code from the app" };
  return runTwoStep("Couldn't make new backup codes", () => makeMyBackupCodes({ password: pass, code: value }));
};

export const disableMyTwoStepAction = async (password: unknown, code: unknown, backup: boolean) => {
  const pass = text(password);
  const value = text(code);
  if (!pass) return { success: false as const, message: "Enter your password" };
  if (backup ? !BACKUP_CODE.test(value) : !SIX_DIGITS.test(value)) return { success: false as const, message: backup ? "Enter one of your backup codes" : "Enter the 6-digit code from the app" };
  return runTwoStep("Couldn't turn off two-step verification", () => disableMyTwoStep(backup ? { password: pass, backupCode: value } : { password: pass, code: value }));
};

export const forgetMyTrustedDeviceAction = async (id: string | null) =>
  id === null
    ? runAction("Couldn't forget your computers", () => forgetMyTrustedDevices())
    : (requireId(id, "device") ?? runAction("Couldn't forget that computer", () => forgetMyTrustedDevice(id)));
