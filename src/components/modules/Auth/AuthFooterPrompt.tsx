"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthLink from "./AuthLink";

interface AuthFooterPromptProps {
  // English keys; shown in the active language.
  prompt: string;
  linkLabel: string;
  href: string;
}

// "Don't have an account? Create one" under a form.
const AuthFooterPrompt = ({ prompt, linkLabel, href }: AuthFooterPromptProps) => {
  const { translate } = useLocale();

  return (
    <p className="text-center text-sm text-muted-foreground">
      {translate(prompt)} <AuthLink href={href}>{translate(linkLabel)}</AuthLink>
    </p>
  );
};

export default AuthFooterPrompt;
