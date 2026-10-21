"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { archivePlan, createPlan, deletePlan, updatePlan } from "@/services/plan.services";
import type { ApiResult } from "@/types/api.types";
import { planServerZodSchema } from "@/zod/plan.validation";

// The admin never sees a plan's slug: a new plan makes it from its name.
// So the API's slug clash is, to them, a name clash.
const SLUG_TAKEN = ["A plan with this slug already exists", "Another plan already uses this slug"];

const asNameClash = <TData>(result: ApiResult<TData>): ApiResult<TData> =>
  !result.success && SLUG_TAKEN.includes(result.message) ? { success: false, message: "Another plan already has this name" } : result;

// The API refuses to delete a plan anything still points at, and its answer
// carries the counts ("0 workspace(s), 12 payment(s) and ..."), so it can't
// be looked up in the dictionary as it comes. Any plan that ever sold gets it.
const PLAN_IN_USE = /^Cannot delete this plan\b/;

const asInUse = <TData>(result: ApiResult<TData>): ApiResult<TData> =>
  !result.success && PLAN_IN_USE.test(result.message)
    ? { success: false, message: "Payments, coupons or workspaces still use this plan. Take it off sale instead." }
    : result;

export const createPlanAction = async (values: unknown) =>
  asNameClash(await runValidatedAction(planServerZodSchema, values, "Failed to create plan", createPlan));

export const updatePlanAction = async (id: string, values: unknown) =>
  requireId(id, "plan") ?? asNameClash(await runValidatedAction(planServerZodSchema, values, "Failed to update plan", (payload) => updatePlan(id, payload)));

export const archivePlanAction = async (id: string) =>
  requireId(id, "plan") ?? runAction("Failed to archive plan", () => archivePlan(id));

// Puts an archived plan back on sale (the opposite of archive).
export const putPlanOnSaleAction = async (id: string) =>
  requireId(id, "plan") ?? runAction("Failed to put the plan on sale", () => updatePlan(id, { isActive: true }));

// The API refuses while any workspace, payment or coupon redemption still
// refers to the plan.
export const deletePlanAction = async (id: string) => requireId(id, "plan") ?? asInUse(await runAction("Failed to delete plan", () => deletePlan(id)));
