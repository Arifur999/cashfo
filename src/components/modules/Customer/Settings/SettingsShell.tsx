"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { sectionFor, sectionOf } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SettingsNav } from "./SettingsNav";

// Every Settings page: the heading, the rail on the left (from 1024px) and
// the section. The index is "Settings"; each section is headed with its
// own name ("Security"), under a Settings eyebrow. On a phone the index is
// a menu (the top bar names it, so its heading is for screen readers only)
// and each section gets a way back to it and its name.
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const isIndex = pathname === "/settings";
  const section = sectionOf(sectionFor(pathname));

  return (
    <PageFrame className={cn("gap-6", isIndex && "max-md:pt-4")}>
      {isIndex ? (
        <PageHeader eyebrow={t("Account@@user")} tone="neutral" title={t("Settings")} description={t("Your account, your security and how the app looks.")} className="max-md:sr-only" />
      ) : (
        <>
          <PageHeader eyebrow={t("Settings")} tone="neutral" title={t(section.label)} className="hidden lg:flex" />
          <div className="flex flex-col gap-1 lg:hidden">
            <Link href="/settings" className="-ml-1 flex min-h-11 w-fit items-center gap-1 rounded-md px-1 text-body font-medium text-ink-2">
              <ChevronLeft className="size-4.5" aria-hidden="true" />
              {t("Settings")}
            </Link>
            <h1 className="text-h2 text-ink">{t(section.label)}</h1>
          </div>
        </>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <SettingsNav />
        </div>
        {/* A size container: from 1024px the rail and the sidebar leave the
            section as little as 440px, so the sections lay themselves out by
            their own width (@xl:, @2xl:), not the window's. */}
        <div className="@container min-w-0">{children}</div>
      </div>
    </PageFrame>
  );
}
