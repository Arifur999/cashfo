import { z } from "zod";
import type { IChangeOwnerPlanPayload, ISuspendOwnerPayload } from "@/types/owner.types";
import { reasonSchema } from "./common.validation";

// "Also sign out of every device now": the API signs them out unless told
// false.
export const suspendOwnerServerZodSchema = z.object({ reason: reasonSchema, signOutEverywhere: z.boolean().optional() }) satisfies z.ZodType<ISuspendOwnerPayload>;

// A note for the other admins on a person's page.
export const ownerNoteZodSchema = z.object({ body: z.string().trim().min(1, "Write the note first").max(2000, "Keep the note under 2,000 characters") });

export const changeOwnerPlanFormZodSchema = z.object({
  newPlanId: z.string().min(1, "Choose a plan"),
  reason: reasonSchema,
});

export type IChangeOwnerPlanFormValues = z.infer<typeof changeOwnerPlanFormZodSchema>;

export const changeOwnerPlanServerZodSchema = changeOwnerPlanFormZodSchema satisfies z.ZodType<IChangeOwnerPlanPayload>;
