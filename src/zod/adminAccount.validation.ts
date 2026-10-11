import { z } from "zod";
import { ADMIN_ROLES, type ICreateAdminPayload } from "@/types/adminAccount.types";

const nameSchema = z.string().trim().min(1, "Enter a name").max(80, "At most 80 characters");
const roleSchema = z.enum(ADMIN_ROLES, "Choose a role");

// A. Form schemas.
export const createAdminFormZodSchema = z.object({
  name: nameSchema,
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: roleSchema,
});

export type ICreateAdminFormValues = z.infer<typeof createAdminFormZodSchema>;

export const updateAdminFormZodSchema = z.object({ name: nameSchema, role: roleSchema });

export type IUpdateAdminFormValues = z.infer<typeof updateAdminFormZodSchema>;

// B. Server schemas.
export const createAdminServerZodSchema = createAdminFormZodSchema satisfies z.ZodType<ICreateAdminPayload>;

export const updateAdminServerZodSchema = updateAdminFormZodSchema;
