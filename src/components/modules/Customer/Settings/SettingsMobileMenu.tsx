"use client";

import { Bell, ChevronRight, Languages, LogOut, Moon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import { SOFT_TONE, type Tone } from "@/components/smartly/tones";
import { APP_VERSION, ownWorkspaces, REMINDERS_ANCHOR, SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsSection } from "@/lib/customer/settingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SECTION_ICONS, useSignOut } from "./SettingsNav";

interface MenuRow {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  value?: string;
}

const TONE: Partial<Record<SettingsSection["key"], Tone>> = { security: "warning", workspaces: "money", help: "info", resources: "neutral" };

// Settings on a phone: the profile card, then every section as a row. The
// phone board splits App preferences into its Language and Theme rows (the
// Theme one only while the dark_mode flag is on), and Reminders gets its own
// row, so the notification switches can be found by name.
export function SettingsMobileMenu() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { signingOut, signOut } = useSignOut();
  const { preference, allowDark } = useTheme();

  const appRows = (href: string): MenuRow[] => {
    const rows: MenuRow[] = [{ key: "language", href, label: "Language", icon: Languages, tone: "money", value: locale === "bn" ? "বাংলা" : "English" }];
    if (allowDark) {
      rows.push({ key: "theme", href, label: "Theme", icon: Moon, tone: "neutral", value: t(preference === "dark" ? "Dark" : preference === "light" ? "Light" : "Match device") });
    }
    rows.push({ key: "reminders", href: `${href}#${REMINDERS_ANCHOR}`, label: "Reminders", icon: Bell, tone: "rose" });
    return rows;
  };

  const rowsOf = (group: SettingsSection["group"]): MenuRow[] =>
    SETTINGS_SECTIONS.filter((section) => section.group === group && section.key !== "profile").flatMap((section): MenuRow[] =>
      section.key === "app"
        ? appRows(section.href)
        : [{ key: section.key, href: section.href, label: section.label, icon: SECTION_ICONS[section.key], tone: TONE[section.key] ?? "neutral", value: section.key === "workspaces" ? formatCount(ownWorkspaces(user.businesses).length, locale) : undefined }],
    );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings/profile" className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-ink">
        {/* The top bar's avatar (forest, mint initials), a size up. */}
        <Avatar name={user.name} src={user.avatarUrl} size={48} alt="" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body-lg font-semibold">
            <span className="sr-only">{t("Profile")}: </span>
            {user.name}
          </span>
          <span className="truncate text-small text-ink-muted">{user.email}</span>
        </span>
        <ChevronRight className="size-4.5 text-ink-muted" aria-hidden="true" />
      </Link>

      {SETTINGS_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="px-1 text-caption font-semibold text-ink-muted">{t(group)}</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {rowsOf(group).map((row) => (
              // 52px plus the divider, as the board draws a row. The ring is
              // drawn inside, where the card's rounded clip can't cut it.
              <Link key={row.key} href={row.href} className="box-content flex min-h-13 items-center gap-3 border-t border-divider px-4 text-ink first:border-t-0 hover:bg-hover focus-visible:-outline-offset-2">
                <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", SOFT_TONE[row.tone])}>
                  <row.icon aria-hidden="true" />
                </span>
                <span className="flex-1 text-body font-medium">{t(row.label)}</span>
                {row.value && <span className="text-body text-ink-muted">{row.value}</span>}
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <button type="button" onClick={signOut} disabled={signingOut} aria-busy={signingOut || undefined} className="flex h-12.5 items-center justify-center gap-2 rounded-lg border border-expense/30 bg-surface text-body-lg font-semibold text-expense disabled:cursor-wait disabled:opacity-70">
        {signingOut ? <Loader size={18} label={t("Signing out...")} /> : <LogOut className="size-4.5" aria-hidden="true" />}
        {signingOut ? t("Signing out...") : t("Sign out")}
      </button>
      <span className="text-center text-caption text-ink-muted">{t("Smartly · version {version}", { version: APP_VERSION })}</span>
    </div>
  );
}
