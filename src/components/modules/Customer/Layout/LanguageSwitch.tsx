"use client";

import { saveLanguageAction } from "@/lib/customer/authActions";
import type { NavApp } from "@/lib/customer/nav";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

// The sidebar foot's English / বাংলা switch: a pill in the Money Tracker,
// 8px corners in the Habit Tracker, as their boards draw it. The screen
// switches at once (cookie); the account's stored preference -- the
// language its emails use -- follows in the background.
export function LanguageSwitch({ app = "money", className }: { app?: NavApp; className?: string }) {
  const { locale, toggleLocale, t } = useLocale();
  const habit = app === "habit";

  function choose(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    void saveLanguageAction(next === "bn" ? "BN" : "EN");
  }

  return (
    <div role="group" aria-label={t("Language")} className={cn("grid min-w-0 grid-cols-2 gap-0.5 bg-surface-sunken p-0.75", habit ? "rounded-sm" : "rounded-full", className)}>
      {OPTIONS.map((option) => {
        const on = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            lang={option.value}
            onClick={() => choose(option.value)}
            className={cn(
              "h-7.5 min-w-0 whitespace-nowrap transition-colors",
              habit ? "rounded-[6px]" : "rounded-full",
              option.value === "bn" ? "font-bn text-body" : "text-small",
              on ? "bg-surface font-semibold text-ink shadow-button" : "font-medium text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
