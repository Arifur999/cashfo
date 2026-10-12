import { newPasswordSchema } from "@/zod/auth.validation";

// 0: nothing typed yet. 1: doesn't meet the rule the backend enforces.
// 2-4: meets it, and then length and variety make it stronger.
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const PASSWORD_STRENGTH_LABELS: Record<Exclude<PasswordStrength, 0>, string> = {
  1: "Too weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return 0;
  }
  if (!newPasswordSchema.safeParse(password).success) {
    return 1;
  }
  const isLong = password.length >= 12;
  const isVaried = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password));
  return (2 + Number(isLong) + Number(isVaried)) as PasswordStrength;
};
