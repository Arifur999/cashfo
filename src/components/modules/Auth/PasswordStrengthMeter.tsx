"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordStrength, PASSWORD_STRENGTH_LABELS, type PasswordStrength } from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";

const BAR_COLORS: Record<Exclude<PasswordStrength, 0>, string> = {
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-emerald-600",
};

const STEPS = [1, 2, 3, 4] as const;

// Under a new-password field: the rule before anything is typed, then a
// four-step meter. Rendered as the field's description, so screen readers
// hear it with the field and it gives way to a validation error.
const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const { translate } = useLocale();
  const strength = getPasswordStrength(password);

  if (strength === 0) {
    return <>{translate("At least 8 characters, with a letter and a number")}</>;
  }

  return (
    <span className="block space-y-1.5">
      <span className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((step) => (
          <span key={step} className={cn("h-1 rounded-full bg-muted transition-colors", step <= strength && BAR_COLORS[strength])} />
        ))}
      </span>
      <span className="block">
        {translate("Password strength")}: <span className="font-medium text-foreground">{translate(PASSWORD_STRENGTH_LABELS[strength])}</span>
      </span>
    </span>
  );
};

export default PasswordStrengthMeter;
