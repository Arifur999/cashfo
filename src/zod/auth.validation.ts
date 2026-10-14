import { z } from "zod";
import type { IRegisterPayload, IResetPasswordPayload, ISignInPayload } from "@/types/auth.types";

// The backend's RegisterDto / ResetPasswordDto rules, checked here first so
// a mistake shows up on the field instead of after a round trip.
export const PASSWORD_MIN_LENGTH = 8;
// The sign-in service refuses longer ones (bcrypt only reads 72 bytes anyway).
export const PASSWORD_MAX_LENGTH = 128;
const LETTER_AND_NUMBER = /(?=.*[A-Za-z])(?=.*\d)/;
// Permissive international phone: an optional "+", digits, spaces and
// hyphens, 6-20 characters -- any country's local format.
const PHONE_PATTERN = /^\+?[0-9\s-]{6,20}$/;

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

// A password being chosen, not one being checked against an existing hash.
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`)
  .regex(LETTER_AND_NUMBER, "Use at least one letter and one number");

// A password checked against an existing one: no rules but the API's cap.
const existingPasswordSchema = z.string().min(1, "Enter your password").max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`);

const confirmPasswordSchema = z.string().min(1, "Type the password again");

export const PASSWORDS_DIFFER_MESSAGE = "The passwords don't match";

// For the confirm field's cross-field validator.
export const getPasswordMismatchError = (password: string, confirmation: string) =>
  confirmation && password !== confirmation ? PASSWORDS_DIFFER_MESSAGE : undefined;

// A. Form schemas -- what the inputs hold; they feed each form.Field
// validator. B. Server schemas -- re-validated inside the action, shaped
// like the payload the API takes.

// Sign in
export const loginFormZodSchema = z.object({
  email: emailSchema,
  // No minimum length: this checks an attempt against an existing hash.
  password: existingPasswordSchema,
});

export type ILoginFormValues = z.infer<typeof loginFormZodSchema>;

export const loginServerZodSchema = loginFormZodSchema satisfies z.ZodType<ISignInPayload>;

// Register
export const registerFormZodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(80, "At most 80 characters")
    // The name goes into the welcome email; the API refuses one carrying a
    // link.
    .refine((value) => !/https?:\/\/|www\.|:\/\//i.test(value), "Leave web addresses out of your name"),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number"),
  password: newPasswordSchema,
  confirmPassword: confirmPasswordSchema,
});

export type IRegisterFormValues = z.infer<typeof registerFormZodSchema>;

export const registerServerZodSchema = z
  .object({
    name: registerFormZodSchema.shape.name,
    email: emailSchema,
    phone: registerFormZodSchema.shape.phone.transform((value) => value || undefined),
    password: newPasswordSchema,
    preferredLanguage: z.enum(["EN", "BN"]).optional(),
    referralCode: z.string().trim().max(64).optional(),
  })
  .transform(({ referralCode, ...payload }) => ({ ...payload, ...(referralCode ? { referralCode } : {}) })) satisfies z.ZodType<IRegisterPayload>;

// Forgot password
export const forgotPasswordFormZodSchema = z.object({ email: emailSchema });

export type IForgotPasswordFormValues = z.infer<typeof forgotPasswordFormZodSchema>;

export const forgotPasswordServerZodSchema = forgotPasswordFormZodSchema;

// Reset password
export const resetPasswordFormZodSchema = z.object({
  newPassword: newPasswordSchema,
  confirmPassword: confirmPasswordSchema,
});

export type IResetPasswordFormValues = z.infer<typeof resetPasswordFormZodSchema>;

export const resetPasswordServerZodSchema = z.object({
  token: z.string().trim().min(1, "This reset link is incomplete. Request a new one."),
  newPassword: newPasswordSchema,
}) satisfies z.ZodType<IResetPasswordPayload>;

// An admin's own password (POST /admin/auth/change-password): the current
// one, then the new one twice. The API signs their other sessions out.
export const changeOwnPasswordFormZodSchema = z.object({
  currentPassword: existingPasswordSchema,
  newPassword: newPasswordSchema,
  confirmPassword: confirmPasswordSchema,
});

export type IChangeOwnPasswordFormValues = z.infer<typeof changeOwnPasswordFormZodSchema>;

export const changeOwnPasswordServerZodSchema = z
  .object({ currentPassword: existingPasswordSchema, newPassword: newPasswordSchema })
  .refine(({ currentPassword, newPassword }) => currentPassword !== newPassword, "Choose a password different from the current one");
