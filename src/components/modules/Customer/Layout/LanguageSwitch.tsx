"use client";

import LocalePill from "@/components/shared/LocalePill";
import { saveLanguageAction } from "@/lib/customer/authActions";

// The customer app's language pill: the screen switches at once (cookie);
// the account's stored preference -- the language its emails use --
// follows in the background.
export function LanguageSwitch({ onDark = false }: { onDark?: boolean }) {
  return <LocalePill onDark={onDark} onChange={(locale) => void saveLanguageAction(locale === "bn" ? "BN" : "EN")} />;
}
