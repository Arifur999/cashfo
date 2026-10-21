"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

// The phone top bar's language switch: one 44px button naming the other
// language in its own script ("বাং" while the panel is in English, "EN" in
// Bangla). The two-part pill would leave the page's name, the only sign of
// where the admin is on a phone, a few letters. Wider bars draw the pill.
const PhoneLocaleToggle = () => {
  const { locale, toggleLocale, translate } = useLocale();
  const next = locale === "en" ? "bn" : "en";

  return (
    <button type="button" onClick={toggleLocale} className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 md:hidden">
      <span className="sr-only">{translate("Change language")}: </span>
      {/* As the pill sets it: the Bangla a size up and lighter. */}
      <span lang={next} className={next === "bn" ? "text-body font-medium" : "text-small font-semibold"}>
        {next === "bn" ? "বাং" : "EN"}
      </span>
    </button>
  );
};

export default PhoneLocaleToggle;
