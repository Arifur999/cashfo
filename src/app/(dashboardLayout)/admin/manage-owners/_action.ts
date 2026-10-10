"use server";

import { requireId, runAction } from "@/lib/runAction";
import { resetOwnerData } from "@/services/owner.services";

export const resetOwnerDataAction = async (userId: string) =>
  requireId(userId, "owner") ?? runAction("Failed to reset owner data", () => resetOwnerData(userId));
