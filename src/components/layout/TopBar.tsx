"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { logoutAction } from "@/lib/authActions";

interface TopBarProps {
  adminName: string;
}

export function TopBar({ adminName }: TopBarProps) {
  const { locale, toggleLocale, translate } = useLocale();

  return (
    <header className="flex h-16 items-center justify-between border-b border-black/5 bg-white px-6">
      <span className="text-sm text-neutral-500">
        {translate("Welcome back,")} <span className="font-medium text-neutral-900">{adminName}</span>
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleLocale}
          aria-label="Toggle language"
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          <Languages className="h-4 w-4" />
          {locale === "en" ? "বাংলা" : "English"}
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-danger-hover"
          >
            {translate("Log out")}
          </button>
        </form>
      </div>
    </header>
  );
}
