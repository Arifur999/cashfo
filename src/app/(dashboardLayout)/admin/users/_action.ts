"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { activateOwner, changeOwnerPlan, suspendOwner } from "@/services/owner.services";
import { changeOwnerPlanServerZodSchema, suspendOwnerServerZodSchema } from "@/zod/owner.validation";

export const suspendOwnerAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(suspendOwnerServerZodSchema, values, "Failed to suspend owner", (payload) => suspendOwner(userId, payload));

export const activateOwnerAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to activate owner", () => activateOwner(userId));

export const changeOwnerPlanAction = async (userId: string, values: unknown) =>
  requireId(userId, "owner") ??
  runValidatedAction(changeOwnerPlanServerZodSchema, values, "Failed to change plan", (payload) => changeOwnerPlan(userId, payload));
