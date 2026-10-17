"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme, type ThemePreference } from "@/components/modules/Customer/Providers/ThemeProvider";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Switch } from "@/components/ui/switch";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AppPreferencesSectionProps {
  today: string;
}

// Preferences that have no switch yet: shown as the design draws them,
// marked coming soon, so the page's shape is already right.
const NUMBER_ROWS = [
  { title: "Digits", body: "English or Bangla numbers.", options: ["1,23,456", "১,২৩,৪৫৬"] },
  { title: "Big amounts", body: "Lakh and crore, or groups of three.", options: ["৳ 1,23,456", "৳ 123,456"] },
  { title: "Dates", body: "Used in lists, reports and statements.", options: ["2 Oct 2026", "02/10/2026", "2026-10-02"] },
  { title: "Week starts on", body: "For weekly budgets and the meal sheet.", options: ["Saturday", "Sunday", "Monday"] },
];

const REMINDERS = [
  { title: "Budget almost used", body: "When a category passes 90% of its budget." },
  { title: "Loan payments due", body: "A day before a loan payment or profit date." },
  { title: "Savings goal check-in", body: "On the 1st, how far each goal has come." },
  { title: "Monthly summary by email", body: "Income, spending and savings for last month." },
];

// Language, theme, and how numbers and dates will look.
export function AppPreferencesSection({ today }: AppPreferencesSectionProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { preference, setTheme } = useTheme();

  function changeLanguage(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    saveLanguageAction(next === "bn" ? "BN" : "EN").then((result) => {
      if (!result.success) toast.error(result.message ?? t("Failed to save language"));
    });
  }

  const row = (title: string, body: string, control: React.ReactNode, soon = false) => (
    <div key={title} className={cn("flex flex-col gap-3 border-t border-surface-sunken px-6 py-4 sm:flex-row sm:items-center sm:gap-5", soon && "opacity-60")}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-body font-semibold text-ink">
          {t(title)}
          {soon && (
            <Chip tone="neutral" size="sm">
              {t("Coming soon")}
            </Chip>
          )}
        </span>
        <span className="text-small leading-normal text-ink-muted">{t(body)}</span>
      </span>
      {control}
    </div>
  );

  return (
    <div className="flex max-w-200 flex-col gap-4">
      <Card padding="none" className="overflow-hidden">
        <h2 className="px-6 py-4 text-title font-semibold text-ink">{t("Language and look")}</h2>
        {row(
          "Language",
          "Saved to your account, so every device opens in it.",
          <SegmentedControl
            label={t("Language")}
            variant="soft"
            value={locale}
            onChange={changeLanguage}
            options={[
              { value: "en", label: "English" },
              { value: "bn", label: <span lang="bn">বাংলা</span>, lang: "bn" },
            ]}
          />,
        )}
        {row(
          "Theme",
          "Dark is easier on the eyes at night.",
          <SegmentedControl<ThemePreference>
            label={t("Theme")}
            variant="soft"
            value={preference}
            onChange={setTheme}
            options={[
              { value: "light", label: t("Light"), icon: <Sun /> },
              { value: "dark", label: t("Dark"), icon: <Moon /> },
              { value: "system", label: t("Match device"), icon: <Monitor /> },
            ]}
          />,
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-0.5 px-6 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Numbers and dates")}</h2>
          <span className="text-small text-ink-muted">{t("How amounts and dates look everywhere in the app.")}</span>
        </div>
        {NUMBER_ROWS.map((item) =>
          row(
            item.title,
            item.body,
            <div role="radiogroup" aria-label={t(item.title)} aria-disabled="true" className="flex shrink-0 gap-0.5 rounded-md bg-surface-sunken p-0.75">
              {item.options.map((option, index) => (
                <span key={option} role="radio" aria-checked={index === 0} className={cn("flex h-8.5 items-center rounded-md px-3 text-body tabular-nums", index === 0 ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(11,61,46,0.14)]" : "font-medium text-ink-2")}>
                  {t(option)}
                </span>
              ))}
            </div>,
            true,
          ),
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-surface-sunken bg-mint-50 px-6 py-3">
          <span className="text-small font-semibold text-emerald">{t("Preview")}</span>
          <span className="text-body-lg font-semibold text-ink tabular-nums">{formatCurrency(123456, "BDT")}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-body-lg font-semibold text-ink">{formatDate(today, "EEE, d MMM yyyy")}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-small text-ink-2">{t("Weeks run Saturday to Friday")}</span>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-0.5 px-6 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Reminders")}</h2>
          <span className="text-small text-ink-muted">{t("Shown inside the app once reminders are switched on.")}</span>
        </div>
        {REMINDERS.map((item) => row(item.title, item.body, <Switch checked={false} disabled aria-label={t(item.title)} />, true))}
      </Card>
    </div>
  );
}
