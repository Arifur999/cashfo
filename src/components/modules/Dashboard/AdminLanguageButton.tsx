"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The top bar's language switch, as the AdminTopbar board draws it: one
// white pill naming the other language in its own script ("বাংলা" while
// the panel is in English, "English" in Bangla). Phones keep a 44px button
// with the short name, so the page's name keeps its room beside it.
const AdminLanguageButton = () => {
  const { locale, toggleLocale, translate } = useLocale();
  const next = locale === "en" ? "bn" : "en";
  const label = translate(next === "bn" ? "Switch language to Bangla" : "Switch language to English");

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={label}
      title={label}
      lang={next}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full whitespace-nowrap text-ink-2 md:size-auto md:h-9.5 md:bg-surface md:px-3.5 md:shadow-control md:hover:bg-hover",
        next === "bn" ? "font-bn text-body font-medium" : "text-small font-semibold md:text-body md:font-medium",
      )}
    >
      <span className="md:hidden">{next === "bn" ? "বাং" : "EN"}</span>
      <span className="hidden md:inline">{next === "bn" ? "বাংলা" : "English"}</span>
    </button>
  );
};

export default AdminLanguageButton;
