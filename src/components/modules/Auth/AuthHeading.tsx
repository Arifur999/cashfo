"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AuthHeadingProps {
  // English keys; shown in the active language.
  title: string;
  subtitle?: string;
  // Sign-in and the password pages use the 36px display title with a 16px
  // line under it; sign-up keeps its line at 14px to make room.
  size?: "display" | "compact";
}

// The page's own heading, above its form.
const AuthHeading = ({ title, subtitle, size = "display" }: AuthHeadingProps) => {
  const { translate } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h1 text-ink lg:text-display">{translate(title)}</h1>
      {subtitle && <p className={cn("text-ink-muted", size === "display" ? "text-body lg:text-body-lg" : "text-body")}>{translate(subtitle)}</p>}
    </div>
  );
};

export default AuthHeading;
