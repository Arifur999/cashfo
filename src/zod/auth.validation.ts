import { z } from "zod";
import type { ILoginPayload } from "@/types/auth.types";

// A. Form schema -- what the inputs hold; feeds each form.Field validator.
export const loginFormZodSchema = z.object({
  email: z.email("Enter a valid email address"),
  // No minimum length: this checks a sign-in attempt against an existing
  // hash, not a new password.
  password: z.string().min(1, "Password is required"),
});

export type ILoginFormValues = z.infer<typeof loginFormZodSchema>;

// B. Server schema -- re-validated inside the action; never trust the
// client-side pass alone.
export const loginServerZodSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
}) satisfies z.ZodType<ILoginPayload>;
