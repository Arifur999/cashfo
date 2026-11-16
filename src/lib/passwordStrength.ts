import { newPasswordSchema } from "@/zod/auth.validation";

// 0: nothing typed yet. 1-2: the backend would refuse it -- 1 meets neither
// of the meter's two rules (8 characters; a letter and a number), 2 meets
// one. 3: meets the rule, as the Register board rates "taka2026" Good.
// 4: and then long or varied as well.
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
    const rulesMet = Number(password.length >= 8) + Number(/[A-Za-z]/.test(password) && /\d/.test(password));
    return rulesMet >= 1 ? 2 : 1;
  }
  const isLong = password.length >= 12;
  const isVaried = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password));
  return isLong || isVaried ? 4 : 3;
};
