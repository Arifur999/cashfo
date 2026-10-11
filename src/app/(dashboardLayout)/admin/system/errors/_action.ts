"use server";

import { requireId, runAction } from "@/lib/runAction";
import { resolveErrorLog } from "@/services/system.services";

export const resolveErrorAction = async (errorId: string) =>
  requireId(errorId, "error") ?? runAction("Failed to resolve the error", () => resolveErrorLog(errorId));
