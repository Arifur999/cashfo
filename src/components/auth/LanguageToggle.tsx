"use client";

import type { AuthLang } from "@/lib/authI18n";

interface LanguageToggleProps {
  value: AuthLang;
  onChange: (lang: AuthLang) => void;
}

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="mb-6 flex justify-center gap-1 rounded-full bg-neutral-100 p-1">
      {(["EN", "BN"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            value === lang ? "bg-surface text-brand-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {lang === "EN" ? "English" : "বাংলা"}
        </button>
      ))}
    </div>
  );
}
