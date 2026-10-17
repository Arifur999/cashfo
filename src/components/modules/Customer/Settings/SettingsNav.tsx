"use client";

import { BookOpen, Building2, CircleHelp, LogOut, ShieldCheck, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { APP_VERSION, sectionFor, SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsSectionKey } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const SECTION_ICONS: Record<SettingsSectionKey, LucideIcon> = {
  profile: UserRound,
  security: ShieldCheck,
  workspaces: Building2,
  app: SlidersHorizontal,
  help: CircleHelp,
  resources: BookOpen,
};

// The rail on the left of every Settings page: the sections in three
// groups, sign out, and the version.
export function SettingsNav() {
  const { t } = useLocale();
  const { logout } = useAuth();
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
              <Link key={section.key} href={section.href} aria-current={on ? "page" : undefined} className={cn("relative flex h-9.5 items-center gap-3 rounded-md px-3 text-body", on ? "bg-mint-50 font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-cream")}>
                {on && <span aria-hidden="true" className="absolute top-2 -left-2.5 h-5.5 w-0.75 rounded-r-[3px] bg-emerald" />}
                <Icon className={cn("size-4.5", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
                {t(section.label)}
              </Link>
            );
          })}
        </div>
      ))}
      <span className="flex-1" />
      <div className="flex flex-col gap-2 border-t border-surface-sunken pt-3">
        <button type="button" onClick={logout} className="flex h-9.5 items-center gap-3 rounded-md px-3 text-left text-body font-semibold text-expense hover:bg-expense-soft">
          <LogOut className="size-4.5" aria-hidden="true" />
          {t("Sign out")}
        </button>
        <span className="px-3 pb-0.5 text-caption text-ink-muted">Smartly · {t("version")} {APP_VERSION}</span>
      </div>
    </nav>
  );
}
