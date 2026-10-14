"use client";

import { Check, CircleCheckBig, Info } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getPasswordStrength, PASSWORD_STRENGTH_LABELS, type PasswordStrength } from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";

const BAR_COLORS: Record<Exclude<PasswordStrength, 0>, string> = {
  1: "bg-expense-fill",
  2: "bg-warning-fill",
  3: "bg-income",
  4: "bg-income",
};

const LABEL_COLORS: Record<Exclude<PasswordStrength, 0>, string> = {
  1: "text-expense",
  2: "text-warning",
  3: "text-brand-ink",
  4: "text-brand-ink",
};

const STEPS = [1, 2, 3, 4] as const;

interface PasswordStrengthMeterProps {
  password: string;
  // "sm": the 4px bars under a 44px field (sign-up); "md": the 6px bars and
  // the fuller check list under a 52px one (new password).
  size?: "sm" | "md";
}

// Under a new-password field: the rule before anything is typed, then the
// four-step meter with the rules ticked off as they are met. Rendered as the
// field's description, so screen readers hear it with the field and it
// gives way to a validation error.
const PasswordStrengthMeter = ({ password, size = "sm" }: PasswordStrengthMeterProps) => {
  const { translate } = useLocale();
  const strength = getPasswordStrength(password);

  if (strength === 0) {
    return <>{translate("At least 8 characters, with a letter and a number")}</>;
  }

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "A letter and a number", met: /[A-Za-z]/.test(password) && /\d/.test(password) },
  ];
  const RuleIcon = size === "md" ? CircleCheckBig : Check;

  return (
    <span className={cn("flex flex-col", size === "md" ? "gap-2" : "gap-2")}>
      <span className={cn("grid grid-cols-4", size === "md" ? "gap-1" : "gap-2")} aria-hidden="true">
        {STEPS.map((step) => (
          <span key={step} className={cn("rounded-full bg-surface-sunken transition-colors", size === "md" ? "h-1.5" : "h-1", step <= strength && BAR_COLORS[strength])} />
        ))}
      </span>
      {size === "md" ? (
        <span className={cn("text-small font-semibold", LABEL_COLORS[strength])}>
          {translate(PASSWORD_STRENGTH_LABELS[strength])} {translate("password")}
        </span>
      ) : (
        <span className="flex items-center justify-between">
          <span>{translate("Password strength")}</span>
          <span className={cn("font-semibold", LABEL_COLORS[strength])}>{translate(PASSWORD_STRENGTH_LABELS[strength])}</span>
        </span>
      )}
      <span className={cn("flex", size === "md" ? "flex-col gap-1 text-small" : "gap-4")}>
        {rules.map((rule) => (
          <span key={rule.label} className={cn("flex items-center gap-1.5", rule.met ? "text-brand-ink" : "text-ink-muted")}>
            {rule.met ? <RuleIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
            {translate(rule.label)}
          </span>
        ))}
      </span>
    </span>
  );
};

export default PasswordStrengthMeter;
