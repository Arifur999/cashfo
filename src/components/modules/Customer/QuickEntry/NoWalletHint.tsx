"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface NoWalletHintProps {
  // English key; shown in the active language.
  message: string;
  // The form's own close, so the modal doesn't stay open over the Wallet
  // page -- the top bar's quick-add modal outlives navigation.
  onNavigate: () => void;
}

// Under a money form's account picker when there is nothing to pick: a new
// workspace starts with no wallets, by design.
export function NoWalletHint({ message, onNavigate }: NoWalletHintProps) {
  const { t } = useLocale();

  return (
    <p className="mt-1 text-xs text-neutral-500">
      {t(message)}{" "}
      <Link href="/balance/wallet" onClick={onNavigate} className="font-medium text-brand-primary hover:underline">
        {t("Add a wallet")}
      </Link>
    </p>
  );
}
