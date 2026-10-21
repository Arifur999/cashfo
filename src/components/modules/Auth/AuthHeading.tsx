"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { bnHeading } from "./bnType";

interface AuthHeadingProps {
  // English keys; shown in the active language.
  title: string;
  subtitle?: string;
  // Sign-in and the password pages use the 36px display title with a 16px
  // line under it; sign-up keeps its line at 14px to make room.
  size?: "display" | "compact";
  // For a heading that replaces the form it came from ("Check your email"):
  // focus moves to it, so screen readers say the new state and the keyboard
  // carries on from here instead of the top of the page.
  focusOnMount?: boolean;
}

// The page's own heading, above its form.
const AuthHeading = ({ title, subtitle, size = "display", focusOnMount = false }: AuthHeadingProps) => {
  const { locale, translate } = useLocale();
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      ref.current?.focus();
    }
  }, [focusOnMount]);

  return (
    <div className="flex flex-col gap-2">
      <h1 ref={ref} tabIndex={focusOnMount ? -1 : undefined} className={cn("text-h1 text-ink outline-none lg:text-display", bnHeading(locale))}>
        {translate(title)}
      </h1>
      {subtitle && <p className={cn("text-ink-muted", size === "display" ? "text-body lg:text-body-lg" : "text-body")}>{translate(subtitle)}</p>}
    </div>
  );
};

export default AuthHeading;
