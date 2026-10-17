"use client";

import { ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import { SOFT_TONE } from "@/components/smartly/tones";
import { APP_VERSION, initialsOf, SETTINGS_GROUPS, SETTINGS_SECTIONS } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SECTION_ICONS } from "./SettingsNav";

// Settings on a phone: the profile card, then every section as a row.
export function SettingsMobileMenu() {
  const { t, locale } = useLocale();
  const { user, logout } = useAuth();
  const { preference } = useTheme();
  const workspaces = user.businesses.length;

  const value: Partial<Record<string, string>> = {
    security: "",
    workspaces: String(workspaces),
    app: `${locale === "bn" ? "বাংলা" : "English"} · ${t(preference === "dark" ? "Dark" : preference === "light" ? "Light" : "Match device")}`,
  };
  const tone: Partial<Record<string, string>> = { profile: "money", security: "warning", workspaces: "money", app: "money", help: "info", resources: "neutral" };

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
            {SETTINGS_SECTIONS.filter((section) => section.group === group && section.key !== "profile").map((section) => {
              const Icon = SECTION_ICONS[section.key];
              return (
                <Link key={section.key} href={section.href} className="flex min-h-13 items-center gap-3 border-t border-surface-sunken px-4 text-ink first:border-t-0">
                  <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", SOFT_TONE[(tone[section.key] ?? "neutral") as keyof typeof SOFT_TONE])}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-body font-medium">{t(section.label)}</span>
                  {value[section.key] && <span className="text-body text-ink-muted">{value[section.key]}</span>}
                  <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                </Link>
              );
            })}
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
