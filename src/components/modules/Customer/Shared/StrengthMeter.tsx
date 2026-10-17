"use client";

import { passwordStrength } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface StrengthMeterProps {
  password: string;
  // A line after the label, like "16 characters with numbers and symbols".
  detail?: string;
  className?: string;
}

const TONE = ["", "bg-expense-fill", "bg-warning-fill", "bg-emerald", "bg-emerald"];
const TEXT = ["text-ink-muted", "text-expense", "text-warning", "text-income", "text-income"];

// Four bars and a word for how strong a password is.
export function StrengthMeter({ password, detail, className }: StrengthMeterProps) {
  const { t } = useLocale();
  const { score, label } = passwordStrength(password);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid flex-1 grid-cols-4 gap-1" role="img" aria-label={`${t("Strength")}: ${t(label)}`}>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={cn("h-1.25 rounded-full", bar <= score ? TONE[score] : "bg-surface-sunken")} />
        ))}
      </div>
      {password.length > 0 && (
        <span className={cn("text-small whitespace-nowrap", TEXT[score])}>
          <b className="font-bold">{t(label)}</b>
          {detail && <span className="hidden sm:inline"> · {detail}</span>}
        </span>
      )}
    </div>
  );
}
