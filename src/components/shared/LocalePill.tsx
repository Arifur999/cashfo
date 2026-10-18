"use client";

import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";

const OPTIONS = [
  { value: "en" as const, label: "EN" },
  { value: "bn" as const, label: "বাংলা", lang: "bn" },
];

interface LocalePillProps {
  onDark?: boolean;
  // The sign-in pages' phone header: "বাং" on 36px buttons, as the phone
  // boards draw it.
  compactOnPhone?: boolean;
  // Runs after the language changes (the customer app saves the choice to
  // the account).
  onChange?: (locale: Locale) => void;
}

// The EN / বাংলা pill in the top bars. The screen switches at once through
// the cookie; Server Components follow on the refresh.
const LocalePill = ({ onDark = false, compactOnPhone = false, onChange }: LocalePillProps) => {
  const { locale, toggleLocale, t } = useLocale();

  function choose(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    onChange?.(next);
  }

  const options = compactOnPhone
    ? OPTIONS.map((option) =>
        option.value === "bn"
          ? {
              ...option,
              label: (
                <>
                  <span className="md:hidden">বাং</span>
                  <span className="hidden md:inline">বাংলা</span>
                </>
              ),
            }
          : option,
      )
    : OPTIONS;
  return <SegmentedControl options={options} value={locale} onChange={choose} label={t("Language")} variant={onDark ? "onDark" : "pill"} className={compactOnPhone ? "max-md:[&>button]:h-9 max-md:[&>button]:min-w-11" : undefined} />;
};

export default LocalePill;
