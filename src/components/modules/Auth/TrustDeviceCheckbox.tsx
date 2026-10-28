"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AuthCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

// A sign-in page's checkbox (AdminTwoFactor): an 18px box with the
// primary's tick, the 14px line beside it. Phones get a 44px row to tap.
export const AuthCheckbox = ({ checked, onChange, label = "Don't ask again on this computer for 30 days", className }: AuthCheckboxProps) => {
  const { t } = useLocale();
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 text-body text-ink-2 lg:min-h-0", className)}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4.5 shrink-0 cursor-pointer rounded-[5px] accent-emerald" />
      {t(label)}
    </label>
  );
};

// "Don't ask again on this computer for 30 days".
const TrustDeviceCheckbox = (props: Omit<AuthCheckboxProps, "label">) => <AuthCheckbox {...props} />;

export default TrustDeviceCheckbox;
