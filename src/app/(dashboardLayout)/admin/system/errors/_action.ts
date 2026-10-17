"use server";

import { z } from "zod";
import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { resolveErrorLog } from "@/services/system.services";

export const resolveErrorAction = async (errorId: string) =>
  requireId(errorId, "error") ?? runAction("Failed to resolve the error", () => resolveErrorLog(errorId));

// The errors page loads at most 100 at a time, so a group never holds more.
const errorIdsSchema = z.array(z.string().trim().min(1)).min(1, "Pick the errors to mark fixed").max(100);

// "Mark all 5 fixed": every loaded error of one group. The API resolves one
// error per call, so this makes one call each and answers how many it fixed.
export const resolveErrorsAction = async (errorIds: unknown) =>
  runValidatedAction(errorIdsSchema, errorIds, "Failed to mark the errors fixed", async (ids) => {
    await Promise.all(ids.map((id) => resolveErrorLog(id)));
    return { success: true as const, message: "Errors marked fixed", data: { count: ids.length } };
  });
