"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The way back to the Settings menu on a phone, over a v16 Settings page
// that draws its own title (Profile, Notifications, Data & privacy).
export function SettingsBack() {
  const { t } = useLocale();
  return (
    <Link href="/settings" className="-ml-1 flex min-h-11 w-fit items-center gap-1 rounded-md px-1 text-body font-medium text-ink-2 lg:hidden">
      <ChevronLeft className="size-4.5" aria-hidden="true" />
      {t("Settings")}
    </Link>
  );
}
