import { z } from "zod";

// My account's name field, as the form holds it and as the action re-checks it.
export const myNameFormZodSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Keep it under 100 characters"),
});

export type IMyNameFormValues = z.infer<typeof myNameFormZodSchema>;
