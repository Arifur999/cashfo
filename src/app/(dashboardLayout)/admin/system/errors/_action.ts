"use server";

import { z } from "zod";
import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { resolveErrorGroup, resolveErrorLog } from "@/services/system.services";

export const resolveErrorAction = async (errorId: string) =>
  requireId(errorId, "error") ?? runAction("Failed to resolve the error", () => resolveErrorLog(errorId));

// The errors page loads at most the newest 500 (as many as the API takes in
// one call), so a group never holds more.
const errorIdsSchema = z.array(z.uuid()).min(1, "Pick the errors to mark fixed").max(500);

// "Mark all 5 fixed": every loaded error of one group, in one call (the API
// writes one audit entry for the lot), answering how many it fixed. By id,
// so it fixes exactly what the group shows -- not the same message from the
// customer app, or outside the chips' window.
export const resolveErrorsAction = async (errorIds: unknown) =>
  runValidatedAction(errorIdsSchema, errorIds, "Failed to mark the errors fixed", async (ids) => {
    const { data } = await resolveErrorGroup({ ids });
    return { success: true as const, message: "Errors marked fixed", data: { count: data.resolved } };
  });
