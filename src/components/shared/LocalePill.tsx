"use client";

import ByWidth from "@/components/smartly/ByWidth";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";

const OPTIONS = [
  { value: "en" as const, label: "EN" },
  { value: "bn" as const, label: "বাংলা", lang: "bn" },
];

interface LocalePillProps {
  onDark?: boolean;
  // The sign-in and legal pages' headers: "EN | বাং" on 44px buttons on a
  // phone (the headers' other targets are 44px too) and "English | বাংলা"
  // wider, as their boards draw it.
  fullNames?: boolean;
  // Runs after the language changes (the customer app saves the choice to
  // the account).
  onChange?: (locale: Locale) => void;
}

// The EN / বাংলা pill in the top bars. The screen switches at once through
// the cookie; Server Components follow on the refresh.
const LocalePill = ({ onDark = false, fullNames = false, onChange }: LocalePillProps) => {
  const { locale, toggleLocale, t } = useLocale();

  function choose(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    onChange?.(next);
  }

  const options = fullNames
    ? [
        { ...OPTIONS[0], label: <ByWidth phone="EN" wide="English" /> },
        { ...OPTIONS[1], label: <ByWidth phone="বাং" wide="বাংলা" /> },
      ]
    : OPTIONS;
  return <SegmentedControl options={options} value={locale} onChange={choose} label={t("Language")} variant={onDark ? "onDark" : "pill"} className={fullNames ? "max-md:[&>button]:h-11 max-md:[&>button]:min-w-11 md:[&>button]:px-4" : undefined} />;
};

export default LocalePill;
