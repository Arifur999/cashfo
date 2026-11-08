"use client";

import { Bell, BookOpen, ChevronRight, CircleHelp, Hash, Languages, LogOut, Moon, Shield, Smartphone, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme } from "@/components/modules/Customer/Providers/ThemeProvider";
import Avatar from "@/components/smartly/Avatar";
import { SOFT_TONE, type Tone } from "@/components/smartly/tones";
import { PLANS_ROUTE } from "@/lib/customer/nav";
import { DEFAULT_PREFERENCES, digitsInForce, sampleAmount } from "@/lib/customer/securityDisplay";
import { APP_VERSION, DEVICES_ANCHOR, NUMBERS_ANCHOR, REMINDERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface MenuRow {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  value?: string;
  // The value in the tile's colour (Security while two-step is off).
  valueTone?: "warning";
  lang?: string;
}

interface SettingsMobileMenuProps {
  // Devices signed in and bell reminders on; null when unread (no count shown).
  devices: number | null;
  remindersOn: number | null;
}


// Settings on a phone (design-v4 SettingsMobile): the profile card, then
// every setting as a row with where it stands. Theme shows only while the
// dark_mode flag is on. Plans has a row too (the board has none, but the
// phone has no other way there besides Home's upgrade card).
export function SettingsMobileMenu({ devices, remindersOn }: SettingsMobileMenuProps) {
  const { t, locale, fmt } = useLocale();
  const { user, askSignOut } = useAuth();
  const { preference, allowDark } = useTheme();
  const prefs = user.preferences ?? DEFAULT_PREFERENCES;
  const twoStepOn = Boolean(user.twoFactorEnabled);

  const groups: { label: string; rows: MenuRow[] }[] = [
    {
      label: "Account@@user",
      rows: [
        { key: "security", href: "/settings/security", label: "Security", icon: Shield, tone: "warning", value: t(twoStepOn ? "2-step on" : "2-step off"), valueTone: twoStepOn ? undefined : "warning" },
        { key: "devices", href: `/settings/security#${DEVICES_ANCHOR}`, label: "Devices", icon: Smartphone, tone: "money", value: devices === null ? undefined : t("{count} signed in", { count: formatCount(devices, fmt) }) },
        { key: "plans", href: PLANS_ROUTE, label: "Plans", icon: Star, tone: "money" },
      ],
    },
    {
      label: "App",
      rows: [
        { key: "language", href: "/settings/app", label: "Language", icon: Languages, tone: "money", value: locale === "bn" ? "বাংলা" : "English", lang: locale === "bn" ? "bn" : undefined },
        ...(allowDark ? [{ key: "theme", href: "/settings/app", label: "Theme", icon: Moon, tone: "neutral" as const, value: t(preference === "dark" ? "Dark" : preference === "light" ? "Light" : "Match device") }] : []),
        { key: "numbers", href: `/settings/app#${NUMBERS_ANCHOR}`, label: "Numbers and dates", icon: Hash, tone: "income", value: sampleAmount(123456, prefs.numberGrouping, digitsInForce(prefs.digitStyle, locale), locale) },
        { key: "reminders", href: `/settings/notifications#${REMINDERS_ANCHOR}`, label: "Reminders", icon: Bell, tone: "rose", value: remindersOn === null ? undefined : t("{count} on", { count: formatCount(remindersOn, fmt) }) },
      ],
    },
    {
      label: "Support",
      rows: [
        { key: "help", href: "/settings/help", label: "Help and support", icon: CircleHelp, tone: "info" },
        { key: "resources", href: "/settings/resources", label: "Resources and legal", icon: BookOpen, tone: "neutral" },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <Link href="/settings/profile" className="flex items-center gap-3 rounded-card border border-line-card bg-surface p-3.5 text-ink shadow-card">
        <Avatar name={user.name} src={user.avatarUrl} size={48} tone="soft" alt="" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body-lg font-semibold">
            <span className="sr-only">{t("Profile")}: </span>
            {user.name}
          </span>
          <span className="truncate text-small text-ink-muted">{user.email}</span>
        </span>
        <ChevronRight className="size-4.5 text-ink-faint" aria-hidden="true" />
      </Link>

      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-[11.5px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t(group.label)}</h2>
          <div className="overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
            {group.rows.map((row) => (
              // The ring is drawn inside, where the card's rounded clip can't cut it.
              <Link key={row.key} href={row.href} className="flex min-h-control-lg items-center gap-3 border-t border-divider px-3.5 text-ink first:border-t-0 hover:bg-hover focus-visible:-outline-offset-2">
                <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-sm [&_svg]:size-4", SOFT_TONE[row.tone])}>
                  <row.icon aria-hidden="true" />
                </span>
                <span className="flex-1 text-[15px] font-medium">{t(row.label)}</span>
                {row.value && (
                  <span lang={row.lang} className={cn("text-[13.5px]", row.valueTone === "warning" ? "text-warning" : "text-ink-muted")}>
                    {row.value}
                  </span>
                )}
                <ChevronRight className="size-4 text-ink-faint" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <button type="button" onClick={askSignOut} className="flex h-12.5 items-center justify-center gap-2 rounded-[14px] border border-expense-line bg-surface text-[15px] font-semibold text-expense">
        <LogOut className="size-4.5" aria-hidden="true" />
        {t("Sign out")}
      </button>
      <span className="text-center text-caption text-ink-faint">{t("Smartly · version {version}", { version: toLocaleDigits(APP_VERSION, fmt) })}</span>
    </div>
  );
}
