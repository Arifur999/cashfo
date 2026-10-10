import type { z } from "zod";

// For TanStack Form validators that combine a zod field schema with a
// cross-field rule: returns the first zod issue's message, or undefined.
export const firstZodError = (schema: z.ZodType, value: unknown): string | undefined => {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
};
