"use client";

import { BookOpen, Building2, CircleHelp, LogOut, ShieldCheck, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import { APP_VERSION, sectionFor, SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsSectionKey } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { toLocaleDigits } from "@/lib/i18n/digits";

export const SECTION_ICONS: Record<SettingsSectionKey, LucideIcon> = {
  profile: UserRound,
  security: ShieldCheck,
  workspaces: Building2,
  app: SlidersHorizontal,
  help: CircleHelp,
  resources: BookOpen,
};

// Sign out, answered at once: the button waits, so a slow network doesn't
// invite a second press. Signing out leaves the page, so it never resets.
export function useSignOut() {
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    logout();
  };
  return { signingOut, signOut };
}

// The rail on the left of every Settings page: the sections in three
// groups, sign out, and the version.
export function SettingsNav() {
  const { t, locale } = useLocale();
  const { signingOut, signOut } = useSignOut();
  const current = sectionFor(usePathname());

  return (
    <nav aria-label={t("Settings sections")} className="flex min-h-105 flex-col rounded-lg border border-line bg-surface p-3">
      {SETTINGS_GROUPS.map((group) => (
        <div key={group} className="mb-3 flex flex-col gap-0.5">
          <span className="px-3 pt-2 pb-1 text-caption font-semibold text-ink-muted">{t(group)}</span>
          {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) => {
            const on = section.key === current;
            const Icon = SECTION_ICONS[section.key];
            return (
              <Link key={section.key} href={section.href} aria-current={on ? "page" : undefined} className={cn("relative flex h-9.5 items-center gap-3 rounded-md px-3 text-body pointer-coarse:h-11", on ? "bg-mint-50 font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-hover")}>
                {/* Centred, so it still sits mid-row when a finger makes the row taller. */}
                {on && <span aria-hidden="true" className="absolute top-1/2 -left-2.5 h-5.5 w-0.75 -translate-y-1/2 rounded-r-[3px] bg-emerald" />}
                <Icon className={cn("size-4.5", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
                {t(section.label)}
              </Link>
            );
          })}
        </div>
      ))}
      <span className="flex-1" />
      <div className="flex flex-col gap-2 border-t border-divider pt-3">
        <button type="button" onClick={signOut} disabled={signingOut} aria-busy={signingOut || undefined} className="flex h-9.5 items-center gap-3 rounded-md px-3 text-left text-body font-semibold text-expense hover:bg-expense-soft disabled:cursor-wait disabled:opacity-70 pointer-coarse:h-11">
          {signingOut ? <Loader size={16} label={t("Signing out...")} /> : <LogOut className="size-4.5" aria-hidden="true" />}
          {signingOut ? t("Signing out...") : t("Sign out")}
        </button>
        <span className="px-3 pb-0.5 text-caption text-ink-muted">{t("Smartly · version {version}", { version: toLocaleDigits(APP_VERSION, locale) })}</span>
      </div>
    </nav>
  );
}
