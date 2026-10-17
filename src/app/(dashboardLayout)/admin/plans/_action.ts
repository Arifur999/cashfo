"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { archivePlan, createPlan, deletePlan, updatePlan } from "@/services/plan.services";
import { planServerZodSchema } from "@/zod/plan.validation";

export const createPlanAction = async (values: unknown) =>
  runValidatedAction(planServerZodSchema, values, "Failed to create plan", createPlan);

export const updatePlanAction = async (id: string, values: unknown) =>
  requireId(id, "plan") ?? runValidatedAction(planServerZodSchema, values, "Failed to update plan", (payload) => updatePlan(id, payload));

export const archivePlanAction = async (id: string) =>
  requireId(id, "plan") ?? runAction("Failed to archive plan", () => archivePlan(id));

// Puts an archived plan back on sale (the opposite of archive).
export const putPlanOnSaleAction = async (id: string) =>
  requireId(id, "plan") ?? runAction("Failed to put the plan on sale", () => updatePlan(id, { isActive: true }));

// The API refuses while any user is still on the plan.
export const deletePlanAction = async (id: string) => requireId(id, "plan") ?? runAction("Failed to delete plan", () => deletePlan(id));
