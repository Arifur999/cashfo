"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AuthHeadingProps {
  // English keys; shown in the active language.
  title: string;
  subtitle?: string;
}

// The page's own heading, above its form.
const AuthHeading = ({ title, subtitle }: AuthHeadingProps) => {
  const { translate } = useLocale();

  return (
    <div className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{translate(title)}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{translate(subtitle)}</p>}
    </div>
  );
};

export default AuthHeading;
