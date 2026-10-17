"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SettingsNav } from "./SettingsNav";

// Every Settings page: the heading, the rail on the left (from 1024px) and
// the section. On a phone the index is a menu and each section gets a way
// back to it.
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const isIndex = usePathname() === "/settings";

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={t("Settings")} tone="neutral" title={t("Settings")} description={t("Your account, your security and how the app looks.")} className={cn(!isIndex && "hidden lg:flex")} />
      {!isIndex && (
        <Link href="/settings" className="flex w-fit items-center gap-1 text-body font-medium text-ink-2 lg:hidden">
          <ChevronLeft className="size-4.5" aria-hidden="true" />
          {t("Settings")}
        </Link>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <SettingsNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </PageFrame>
  );
}
