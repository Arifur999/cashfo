"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { bnHeading } from "./bnType";

interface AuthHeadingProps {
  // English keys; shown in the active language.
  title: string;
  subtitle?: React.ReactNode;
  // The admin pages' heading (AdminLogin): 26px bold over a 14.5px line;
  // the app's (Main): 28px semibold, 24px on a phone, over a 14px line.
  admin?: boolean;
  // For a heading that replaces the form it came from ("Check your email"):
  // focus moves to it, so screen readers say the new state and the keyboard
  // carries on from here instead of the top of the page.
  focusOnMount?: boolean;
}

// The page's own heading, above its form.
const AuthHeading = ({ title, subtitle, admin = false, focusOnMount = false }: AuthHeadingProps) => {
  const { locale, translate } = useLocale();
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      ref.current?.focus();
    }
  }, [focusOnMount]);

  return (
    <div className={cn("flex flex-col", admin ? "gap-1.5" : "gap-1.5 lg:gap-2")}>
      <h1
        ref={ref}
        tabIndex={focusOnMount ? -1 : undefined}
        className={cn(
          "text-ink tracking-[-0.02em] outline-none",
          admin ? "text-[26px] leading-[1.25] font-bold" : "text-page-title leading-[1.25] font-semibold lg:text-h1 lg:leading-[1.25] lg:font-semibold",
          bnHeading(locale),
        )}
      >
        {translate(title)}
      </h1>
      {subtitle && <p className={cn("text-ink-muted", admin ? "text-[14.5px]" : "text-body", "leading-[1.5]")}>{typeof subtitle === "string" ? translate(subtitle) : subtitle}</p>}
    </div>
  );
};

export default AuthHeading;
