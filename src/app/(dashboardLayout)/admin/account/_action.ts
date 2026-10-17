"use server";

import { runAction, runValidatedAction } from "@/lib/runAction";
import { signOutMyOtherSessions, updateMyName } from "@/services/myAccount.services";
import { myNameFormZodSchema } from "@/zod/myAccount.validation";

export const updateMyNameAction = async (values: unknown) =>
  runValidatedAction(myNameFormZodSchema, values, "Failed to save your name", ({ name }) => updateMyName(name));

export const signOutOtherDevicesAction = async () => runAction("Failed to sign out your other devices", () => signOutMyOtherSessions());
