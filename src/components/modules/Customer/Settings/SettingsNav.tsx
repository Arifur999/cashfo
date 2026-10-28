"use client";

import { BookOpen, Building2, CircleHelp, LogOut, Shield, SlidersVertical, Star, UserRound, type LucideIcon } from "lucide-react";
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
  security: Shield,
  plans: Star,
  workspaces: Building2,
  app: SlidersVertical,
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

// The rail on the left of every Settings page (design-v4 SettingsNav): the
// sections in three groups, sign out, and the version. Workspaces has no
// row (the workspace switcher and the account menu lead there), so nothing
// is lit on its page.
export function SettingsNav() {
  const { t, fmt } = useLocale();
  const { signingOut, signOut } = useSignOut();
  const pathname = usePathname();
  const current = sectionFor(pathname);

  return (
    <nav aria-label={t("Settings sections")} className="flex min-h-116 flex-col rounded-card border border-line-card bg-surface p-2.5 shadow-card">
      {SETTINGS_GROUPS.map((group) => (
        <div key={group} className="mb-2.5 flex flex-col gap-0.5">
          <span className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t(group)}</span>
          {SETTINGS_SECTIONS.filter((section) => section.group === group && !section.hidden).map((section) => {
            const on = section.key === current;
            const Icon = SECTION_ICONS[section.key];
            return (
              <Link key={section.key} href={section.href} aria-current={on ? "page" : undefined} className={cn("flex h-9.5 items-center gap-2.5 rounded-md px-2.5 text-body pointer-coarse:h-11", on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-hover")}>
                <Icon className={cn("size-4.25", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
                {t(section.label)}
              </Link>
            );
          })}
        </div>
      ))}
      <span className="flex-1" />
      <div className="flex flex-col gap-1.5 border-t border-divider pt-2.5">
        <button type="button" onClick={signOut} disabled={signingOut} aria-busy={signingOut || undefined} className="flex h-9.5 items-center gap-2.5 rounded-field px-2.5 text-left text-body font-semibold whitespace-nowrap text-expense hover:bg-expense-soft disabled:cursor-wait disabled:opacity-70 pointer-coarse:h-11">
          {signingOut ? <Loader size={16} label={t("Signing out...")} /> : <LogOut className="size-4.25 text-expense-fill" aria-hidden="true" />}
          {signingOut ? t("Signing out...") : t("Sign out")}
        </button>
        <span className="px-2.5 pb-0.5 text-caption text-ink-faint">{t("Smartly · version {version}", { version: toLocaleDigits(APP_VERSION, fmt) })}</span>
      </div>
    </nav>
  );
}
