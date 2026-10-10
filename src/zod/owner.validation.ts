import { z } from "zod";
import type { IChangeOwnerPlanPayload, ISuspendOwnerPayload } from "@/types/owner.types";
import { reasonSchema } from "./common.validation";

export const suspendOwnerServerZodSchema = z.object({ reason: reasonSchema }) satisfies z.ZodType<ISuspendOwnerPayload>;

export const changeOwnerPlanFormZodSchema = z.object({
  newPlanId: z.string().min(1, "Choose a plan"),
  reason: reasonSchema,
});

export type IChangeOwnerPlanFormValues = z.infer<typeof changeOwnerPlanFormZodSchema>;

export const changeOwnerPlanServerZodSchema = changeOwnerPlanFormZodSchema satisfies z.ZodType<IChangeOwnerPlanPayload>;
