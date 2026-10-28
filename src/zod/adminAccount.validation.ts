import { z } from "zod";
import { ADMIN_ROLES, type ICreateAdminInvitePayload, type ICreateAdminPayload } from "@/types/adminAccount.types";

const nameSchema = z.string().trim().min(1, "Enter a name").max(80, "At most 80 characters");
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
const roleSchema = z.enum(ADMIN_ROLES, "Choose a role");

// A. Form schemas.
export const createAdminFormZodSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
});

export type ICreateAdminFormValues = z.infer<typeof createAdminFormZodSchema>;

export const updateAdminFormZodSchema = z.object({ name: nameSchema, role: roleSchema });

export type IUpdateAdminFormValues = z.infer<typeof updateAdminFormZodSchema>;

// The invite drawer. The name may stay empty: whoever accepts types theirs.
export const inviteAdminFormZodSchema = z.object({
  name: z.string().trim().max(80, "At most 80 characters"),
  email: emailSchema,
  role: roleSchema,
});

export type IInviteAdminFormValues = z.infer<typeof inviteAdminFormZodSchema>;

// B. Server schemas.
export const createAdminServerZodSchema = createAdminFormZodSchema satisfies z.ZodType<ICreateAdminPayload>;

export const updateAdminServerZodSchema = updateAdminFormZodSchema;

// An empty name is left out, so the invite asks for it.
export const inviteAdminServerZodSchema = inviteAdminFormZodSchema.transform(({ name, ...rest }) => (name ? { name, ...rest } : rest)) satisfies z.ZodType<
  ICreateAdminInvitePayload,
  IInviteAdminFormValues
>;

export const twoStepRuleServerZodSchema = z.object({ adminTwoStepRequired: z.boolean() }).strict();
