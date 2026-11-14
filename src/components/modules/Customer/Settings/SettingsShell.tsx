"use client";

import { usePathname } from "next/navigation";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { sectionFor, sectionOf } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SettingsBack } from "./SettingsBack";

// Every Settings page (SettingsProfile and its sisters): the "Settings"
// heading over the section, at most 880px wide. The sections are the
// sidebar's Settings group, so the heading stays the same and nothing moves
// between them. On a phone the index is a menu (the top bar names it, so
// its heading is for screen readers only) and each section gets a way back
// to it and its name. Plans (UpgradePlan) is a page of its own: its heading
// and full width, and so is its payment page (Checkout).
const FULL_WIDTH = ["/settings/profile", "/settings/security", "/settings/notifications", "/settings/app", "/settings/data", "/settings/help", "/settings/resources"];

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const isIndex = pathname === "/settings";
  const section = sectionOf(sectionFor(pathname));

  if (pathname === PLANS_ROUTE || pathname.startsWith(`${PLANS_ROUTE}/`)) return <PageFrame className="gap-5 leading-[normal] md:pt-7 md:pb-10">{children}</PageFrame>;
  // The v16 boards draw these at full width with their own title; so does
  // the index on a wide screen, where it is the profile.
  if (FULL_WIDTH.includes(pathname) || isIndex) return <>{children}</>;

  return (
    <PageFrame className="gap-5.5 md:pt-7 md:pb-8">
      <PageHeader title={t("Settings")} className="hidden lg:flex" />
      <div className="flex flex-col gap-1 lg:hidden">
        <SettingsBack />
        <h1 className="text-h2 text-ink">{t(section.label)}</h1>
      </div>
      {/* A size container: the sections lay themselves out by their own
          width (@xl:, @2xl:), not the window's. */}
      <div className="@container w-full max-w-220 min-w-0">{children}</div>
    </PageFrame>
  );
}
