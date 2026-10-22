"use client";

import { ChevronRight, CircleAlert, Monitor, Moon, RotateCw, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme, type ThemePreference } from "@/components/modules/Customer/Providers/ThemeProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Switch } from "@/components/ui/switch";
import type { ReminderPreferences, RemindersOverview } from "@/lib/customer/api";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { getReminderPreferencesAction, saveReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { activeReminderRows } from "@/lib/customer/reminderDisplay";
import { getRemindersAction, saveRemindHabitsAction } from "@/lib/customer/remindersActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { REMINDERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { PushDeviceRow } from "./PushDeviceRow";

interface AppPreferencesSectionProps {
  today: string;
  // null when they couldn't be read: the card says so, with Try again, and
  // the switches stay locked until they are read.
  reminders: ReminderPreferences | null;
  // Habit reminders (GET /api/reminders): the master switch and the saved
  // ones; null when they couldn't be read, like `reminders`.
  habitReminders: RemindersOverview | null;
  // What each habit reminder is about, by id (habit, challenge, book, skill).
  reminderNames: Record<string, string>;
  // The server's push key; null when push isn't set up there.
  pushPublicKey: string | null;
}

// Preferences that have no switch yet: shown as the design draws them,
// marked coming soon, so the page's shape is already right. The choices are
// plain words, not controls that can't be used.
const NUMBER_ROWS = [
  { title: "Digits", body: "English or Bangla numbers.", options: ["1,23,456", "১,২৩,৪৫৬"] },
  { title: "Big amounts", body: "Lakh and crore, or groups of three.", options: ["৳ 1,23,456", "৳ 123,456"] },
  { title: "Dates", body: "Used in lists, reports and statements.", options: ["2 Oct 2026", "02/10/2026", "2026-10-02"] },
  { title: "Week starts on", body: "For weekly budgets and the meal sheet.", options: ["Saturday", "Sunday", "Monday"] },
];

// The bell's reminders. A monthly summary by email is still to come.
const REMINDERS: { key: keyof ReminderPreferences; title: string; body: string }[] = [
  { key: "budget", title: "Budget almost used", body: "When a category passes 90% of its budget." },
  { key: "loans", title: "Loan payments due", body: "A day before a loan payment or profit date." },
  { key: "savings", title: "Savings goal check-in", body: "On the 1st, how far each goal has come." },
];

// Language, theme (while the dark_mode flag is on), and how numbers and
// dates will look.
export function AppPreferencesSection({ today, reminders: initialReminders, habitReminders: initialHabitReminders, reminderNames, pushPublicKey }: AppPreferencesSectionProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { preference, setTheme, allowDark } = useTheme();
  const { user } = useAuth();
  const [reminders, setReminders] = useState(initialReminders);
  const [habitReminders, setHabitReminders] = useState(initialHabitReminders);
  const [readingReminders, setReadingReminders] = useState(false);
  const readOnly = Boolean(user.impersonatedBy);
  const habitRows = habitReminders ? activeReminderRows(habitReminders.reminders, reminderNames, t, locale) : [];

  // The phone menu's Reminders row lands on /settings/app#reminders after
  // Settings' loading screen, which already used up the router's hash scroll.
  useEffect(() => {
    if (window.location.hash === `#${REMINDERS_ANCHOR}`) document.getElementById(REMINDERS_ANCHOR)?.scrollIntoView({ block: "start" });
  }, []);

  // Saved as soon as it flips; put back if the save fails.
  function changeReminder(key: keyof ReminderPreferences, on: boolean) {
    if (!reminders) return;
    const before = reminders;
    const next = { ...reminders, [key]: on };
    setReminders(next);
    saveReminderPreferencesAction(next).then((result) => {
      if (result.success) return;
      setReminders(before);
      toast.error(result.message ?? t("Failed to save reminders"));
    });
  }

  // The master switch for every habit-area reminder; the same save-or-put-back.
  function changeRemindHabits(on: boolean) {
    if (!habitReminders) return;
    const before = habitReminders;
    setHabitReminders({ ...habitReminders, remindHabits: on });
    saveRemindHabitsAction(on).then((result) => {
      if (result.success) return;
      setHabitReminders(before);
      toast.error(t(result.message ?? "Failed to save reminders"));
    });
  }

  async function readReminders() {
    setReadingReminders(true);
    try {
      const [result, habitResult] = await Promise.all([
        reminders ? null : getReminderPreferencesAction(),
        habitReminders ? null : getRemindersAction(),
      ]);
      if (result?.success && result.data) setReminders(result.data);
      if (habitResult?.success && habitResult.data) setHabitReminders(habitResult.data);
      if ((result && !result.success) || (habitResult && !habitResult.success)) toast.error(t("Couldn't load your reminders."));
    } catch {
      toast.error(t("Couldn't load your reminders."));
    } finally {
      setReadingReminders(false);
    }
  }

  function changeLanguage(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    saveLanguageAction(next === "bn" ? "BN" : "EN").then((result) => {
      if (!result.success) toast.error(result.message ?? t("Failed to save language"));
    });
  }

  // From 576px of section the control sits beside its words; narrower, under
  // them. The section's width decides, not the window's: the rail and the
  // sidebar leave it 440px at 1024.
  const row = (title: string, body: string, control: React.ReactNode, soon = false) => (
    <div key={title} className="flex flex-col gap-3 border-t border-divider px-6 py-4 @xl:flex-row @xl:items-center @xl:gap-5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
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
        {/* With dark mode switched off there is no look to pick, only the language. */}
        <h2 className="px-6 py-4 text-title font-semibold text-ink">{allowDark ? t("Language and look") : t("Language")}</h2>
        {row(
          "Language",
          "Saved to your account, so every device opens in it.",
          <SegmentedControl
            label={t("Language")}
            variant="soft"
            size="coarse"
            value={locale}
            onChange={changeLanguage}
            className="shrink-0"
            options={[
              { value: "en", label: "English" },
              { value: "bn", label: <span lang="bn">বাংলা</span>, lang: "bn" },
            ]}
          />,
        )}
        {allowDark &&
          row(
            "Theme",
            "Dark is easier on the eyes at night.",
            <SegmentedControl<ThemePreference>
              label={t("Theme")}
              variant="soft"
              size="coarse"
              value={preference}
              onChange={setTheme}
              // 16px icons, so the three choices fit a phone's 310px.
              className="shrink-0 [&_svg]:size-4"
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
            <span className="shrink-0 text-body text-ink-muted tabular-nums">{item.options.map((option) => t(option)).join(" · ")}</span>,
            true,
          ),
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-divider bg-mint-50 px-6 py-3">
          <span className="text-small font-semibold text-emerald">{t("Preview@@format")}</span>
          <span className="text-body-lg font-semibold text-ink tabular-nums">{formatCurrency(123456, "BDT", locale)}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-body-lg font-semibold text-ink">{formatDate(today, "EEE, d MMM yyyy", locale)}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-small text-ink-2">{t("Weeks run Saturday to Friday")}</span>
        </div>
      </Card>

      <Card id={REMINDERS_ANCHOR} padding="none" className="scroll-mt-4 overflow-hidden">
        <div className="flex flex-col gap-0.5 px-6 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Reminders")}</h2>
          <span className="text-small text-ink-muted">{t("In the bell, and as notifications on the devices you turn them on for.")}</span>
        </div>
        {(reminders === null || habitReminders === null) && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-warning-soft px-6 py-3 text-small text-warning">
            <span className="flex items-center gap-2">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {t("Couldn't load your reminders.")}
            </span>
            <Button variant="secondary" size="sm" onClick={() => void readReminders()} disabled={readingReminders} className="pointer-coarse:h-11">
              {readingReminders ? <Loader size={14} /> : <RotateCw aria-hidden="true" />}
              {t("Try again")}
            </Button>
          </div>
        )}
        <PushDeviceRow publicKey={pushPublicKey} readOnly={readOnly} />
        {REMINDERS.map((item) => row(item.title, item.body, <Switch checked={reminders?.[item.key] ?? false} disabled={!reminders} onCheckedChange={(on) => changeReminder(item.key, on)} aria-label={t(item.title)} />))}
        {row(
          "Habit reminders",
          "Daily habits, challenges, to-dos, prayers, Sehri and Iftar, books and skills, at the times you set on each.",
          <Switch checked={habitReminders?.remindHabits ?? false} disabled={!habitReminders} onCheckedChange={changeRemindHabits} aria-label={t("Habit reminders")} />,
        )}
        {habitReminders && (
          <div className="flex flex-col gap-2 px-6 pb-4">
            <span className="text-small font-semibold text-ink-2">{t("Your habit reminders")}</span>
            {habitRows.length === 0 ? (
              <span className="text-small text-ink-muted">{t("None yet. Set one on a habit, a challenge, a to-do, Namaz, Ramadan, a book or a skill.")}</span>
            ) : (
              <ul className={habitReminders.remindHabits ? "flex flex-col" : "flex flex-col opacity-60"}>
                {habitRows.map((item) => (
                  <li key={item.id} className="border-t border-divider first:border-t-0">
                    <Link href={item.href} className="flex min-h-11 items-center gap-3 py-2 hover:text-emerald">
                      <Chip tone="habits" size="sm">
                        {item.kindLabel}
                      </Chip>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 @xl:flex-row @xl:items-baseline @xl:gap-2">
                        <span className="truncate text-body font-semibold text-ink">{item.name}</span>
                        <span className="text-small text-ink-muted tabular-nums">{item.summary}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!habitReminders.remindHabits && habitRows.length > 0 && <span className="text-caption text-ink-muted">{t("Paused while Habit reminders is off.")}</span>}
          </div>
        )}
        {row("Monthly summary by email", "Income, spending and savings for last month.", <Switch checked={false} disabled aria-label={t("Monthly summary by email")} />, true)}
      </Card>
    </div>
  );
}
