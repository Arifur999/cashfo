"use client";

import { passwordStrength } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface StrengthMeterProps {
  password: string;
  // A line after the label, like "16 characters with numbers and symbols".
  detail?: string;
  // Four 40px bars with the words beside them wrapping (the vault's Add
  // login), rather than bars across the width.
  fixedBars?: boolean;
  className?: string;
}

const TONE = ["", "bg-expense-fill", "bg-warning-fill", "bg-emerald", "bg-emerald"];
const TEXT = ["text-ink-muted", "text-expense", "text-warning", "text-income", "text-income"];

// Four bars and a word for how strong a password is.
export function StrengthMeter({ password, detail, fixedBars = false, className }: StrengthMeterProps) {
  const { t } = useLocale();
  const { score, label } = passwordStrength(password);
  return (
    <div className={cn("flex items-center", fixedBars ? "gap-2.5" : "gap-3", className)}>
      <div className={cn("grid gap-1", fixedBars ? "shrink-0 grid-cols-[repeat(4,40px)]" : "flex-1 grid-cols-4")} role="img" aria-label={`${t("Strength")}: ${t(label)}`}>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={cn("h-1.25 rounded-full", bar <= score ? TONE[score] : "bg-line")} />
        ))}
      </div>
      {password.length > 0 && (
        <span className={cn(fixedBars ? "text-[12.5px] leading-normal" : "text-small whitespace-nowrap", TEXT[score])}>
          <b className="font-bold">{t(label)}</b>
          {detail && <span className="hidden sm:inline"> · {detail}</span>}
        </span>
      )}
    </div>
  );
}
