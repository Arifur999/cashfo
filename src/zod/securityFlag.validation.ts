import { z } from "zod";
import { FLAG_STATUSES } from "@/types/securityFlag.types";

export const updateFlagStatusServerZodSchema = z.object({ status: z.enum(FLAG_STATUSES) });
