"use client";

import ByWidth from "@/components/smartly/ByWidth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthLink from "./AuthLink";

interface AuthFooterPromptProps {
  // English keys; shown in the active language.
  prompt: string;
  // The question from md up, where the wide board words it differently.
  widePrompt?: string;
  linkLabel: string;
  href: string;
}

// "New to Smartly? Create an account" under a form.
const AuthFooterPrompt = ({ prompt, widePrompt, linkLabel, href }: AuthFooterPromptProps) => {
  const { translate } = useLocale();

  return (
    <p className="text-center text-body text-ink-muted">
      {widePrompt ? <ByWidth phone={translate(prompt)} wide={translate(widePrompt)} /> : translate(prompt)} <AuthLink href={href}>{translate(linkLabel)}</AuthLink>
    </p>
  );
};

export default AuthFooterPrompt;
