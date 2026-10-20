"use client";

import { ChevronRight, Languages, LogOut, Moon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import { SOFT_TONE, type Tone } from "@/components/smartly/tones";
import { APP_VERSION, initialsOf, SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsSection } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SECTION_ICONS } from "./SettingsNav";

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
// phone board splits App preferences into its Language and Theme rows.
export function SettingsMobileMenu() {
  const { t, locale } = useLocale();
  const { user, logout } = useAuth();
  const { preference } = useTheme();

  const rowsOf = (group: SettingsSection["group"]): MenuRow[] =>
    SETTINGS_SECTIONS.filter((section) => section.group === group && section.key !== "profile").flatMap((section): MenuRow[] =>
      section.key === "app"
        ? [
            { key: "language", href: section.href, label: "Language", icon: Languages, tone: "money", value: locale === "bn" ? "বাংলা" : "English" },
            { key: "theme", href: section.href, label: "Theme", icon: Moon, tone: "neutral", value: t(preference === "dark" ? "Dark" : preference === "light" ? "Light" : "Match device") },
          ]
        : [{ key: section.key, href: section.href, label: section.label, icon: SECTION_ICONS[section.key], tone: TONE[section.key] ?? "neutral", value: section.key === "workspaces" ? String(user.businesses.length) : undefined }],
    );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/settings/profile" className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-ink">
        {user.avatarUrl ? (
          // A backend-served upload, so a plain <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--emerald)_0%,var(--forest)_100%)] text-body-lg font-bold text-white">{initialsOf(user.name)}</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body-lg font-semibold">{user.name}</span>
          <span className="truncate text-small text-ink-muted">{user.email}</span>
        </span>
        <ChevronRight className="size-4.5 text-ink-muted" aria-hidden="true" />
      </Link>

      {SETTINGS_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="px-1 text-caption font-semibold text-ink-muted">{t(group)}</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {rowsOf(group).map((row) => (
              // 52px plus the divider, as the board draws a row.
              <Link key={row.key} href={row.href} className="box-content flex min-h-13 items-center gap-3 border-t border-divider px-4 text-ink first:border-t-0">
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

      <button type="button" onClick={logout} className="flex h-12.5 items-center justify-center gap-2 rounded-lg border border-expense/30 bg-surface text-body-lg font-semibold text-expense">
        <LogOut className="size-4.5" aria-hidden="true" />
        {t("Sign out")}
      </button>
      <span className="text-center text-caption text-ink-muted">Smartly · {t("version")} {APP_VERSION}</span>
    </div>
  );
}
