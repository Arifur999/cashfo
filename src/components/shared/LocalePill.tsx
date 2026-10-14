"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";

const OPTIONS = [
  { value: "en" as const, label: "EN" },
  { value: "bn" as const, label: "বাংলা", lang: "bn" },
];

interface LocalePillProps {
  onDark?: boolean;
  // Runs after the language changes (the customer app saves the choice to
  // the account).
  onChange?: (locale: Locale) => void;
}

// The EN / বাংলা pill in the top bars. The screen switches at once through
// the cookie; Server Components follow on the refresh.
const LocalePill = ({ onDark = false, onChange }: LocalePillProps) => {
  const { locale, toggleLocale, t } = useLocale();

  function choose(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    onChange?.(next);
  }

  return <SegmentedControl options={OPTIONS} value={locale} onChange={choose} label={t("Language")} variant={onDark ? "onDark" : "pill"} />;
};

export default LocalePill;
