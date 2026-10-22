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
// the section. The index is "Settings" (and Profile from 1024px, where it
// shows Profile); each section is headed with its own name ("Security"). Both share the Settings eyebrow and the subtitle,
// so the header keeps one height and the rail doesn't move between
// sections. On a phone the index is a menu (the top bar names it, so its
// heading is for screen readers only) and each section gets a way back to
// it and its name.
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const isIndex = pathname === "/settings";
  const section = sectionOf(sectionFor(pathname));
  const subtitle = t("Your account, your security and how the app looks.");

  return (
    <PageFrame className={cn("gap-6", isIndex && "max-md:pt-4")}>
      {isIndex ? (
        <>
          {/* Below 1024px the index is the menu, headed "Settings". From
              1024px it shows Profile with Profile lit in the rail, so it is
              headed like /settings/profile. One is display:none at each
              width, so there is only ever one h1. */}
          <PageHeader eyebrow={t("Settings")} tone="neutral" title={t("Settings")} description={subtitle} className="max-md:sr-only lg:hidden" />
          <PageHeader eyebrow={t("Settings")} tone="neutral" title={t(section.label)} description={subtitle} className="hidden lg:flex" />
        </>
      ) : (
        <>
          <PageHeader eyebrow={t("Settings")} tone="neutral" title={t(section.label)} description={subtitle} className="hidden lg:flex" />
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
