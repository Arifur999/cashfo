"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthLink from "./AuthLink";

interface AuthFooterPromptProps {
  // English keys; shown in the active language.
  prompt: string;
  linkLabel: string;
  href: string;
}

// "New to Smartly? Create an account" under a form.
const AuthFooterPrompt = ({ prompt, linkLabel, href }: AuthFooterPromptProps) => {
  const { translate } = useLocale();

  return (
    <p className="text-center text-body text-ink-muted">
      {translate(prompt)} <AuthLink href={href}>{translate(linkLabel)}</AuthLink>
    </p>
  );
};

export default AuthFooterPrompt;
