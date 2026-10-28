"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import AuthLink from "./AuthLink";

interface AuthFooterPromptProps {
  // English keys; shown in the active language.
  prompt: string;
  linkLabel: string;
  href: string;
  className?: string;
}

// "Don't have an account? Create an account" under a form; on a phone it
// sits at the foot of the screen, as LoginMobile and RegisterMobile have it.
const AuthFooterPrompt = ({ prompt, linkLabel, href, className }: AuthFooterPromptProps) => {
  const { translate } = useLocale();

  return (
    <p className={cn("text-center text-body text-ink-muted max-lg:mt-auto", className)}>
      {translate(prompt)} <AuthLink href={href}>{translate(linkLabel)}</AuthLink>
    </p>
  );
};

export default AuthFooterPrompt;
