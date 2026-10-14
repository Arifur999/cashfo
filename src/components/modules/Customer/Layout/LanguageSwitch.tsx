"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";

const OPTIONS = [
  { value: "en" as const, label: "EN" },
  { value: "bn" as const, label: "বাংলা", lang: "bn" },
];

// The EN / বাংলা pill. The screen switches at once (cookie); the account's
// stored preference -- the language its emails use -- follows in the
// background.
export function LanguageSwitch({ onDark = false }: { onDark?: boolean }) {
  const { locale, toggleLocale, t } = useLocale();

  function choose(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    void saveLanguageAction(next === "bn" ? "BN" : "EN");
  }

  return <SegmentedControl options={OPTIONS} value={locale} onChange={choose} label={t("Language")} variant={onDark ? "onDark" : "pill"} />;
}
