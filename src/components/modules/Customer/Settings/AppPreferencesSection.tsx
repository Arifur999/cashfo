"use client";

import { ChevronRight, CircleAlert, Monitor, Moon, RotateCw, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme, type ThemePreference } from "@/components/modules/Customer/Providers/ThemeProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import SegmentedControl, { type SegmentOption } from "@/components/smartly/SegmentedControl";
import type { DateStyle, DigitStyle, DisplayPreferences, NumberGrouping, ReminderPreferences, RemindersOverview, WeekStart } from "@/lib/customer/api";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { formatDate } from "@/lib/customer/date";
import { getReminderPreferencesAction, saveReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { activeReminderRows } from "@/lib/customer/reminderDisplay";
import { getRemindersAction, saveRemindHabitsAction } from "@/lib/customer/remindersActions";
import { savePreferencesAction } from "@/lib/customer/securityActions";
import { DATE_STYLES, DEFAULT_PREFERENCES, digitsInForce, sampleAmount, sampleDate, sampleNumber, WEEK_START_LABEL, WEEK_STARTS, weekRun } from "@/lib/customer/securityDisplay";
import { NUMBERS_ANCHOR, REMINDERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PushDeviceRow } from "./PushDeviceRow";
import { SettingSwitch } from "./SettingSwitch";

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

// The bell's reminders.
const REMINDERS: { key: "budget" | "loans" | "savings"; title: string; body: string }[] = [
  { key: "budget", title: "Budget almost used", body: "When a category passes 90% of its budget." },
  { key: "loans", title: "Loan payments due", body: "A day before a loan payment or profit date." },
  { key: "savings", title: "Savings goal check-in", body: "On the 1st, how far each goal has come." },
];

const PX = "px-4 md:px-5.5";
// The board's segments: a sunken track, 34px pills of 13.5px words.
const SEGMENTS = "shrink-0 self-start @xl:self-auto [&_button]:text-[13.5px]";

// Language, theme (while the dark_mode flag is on), how numbers and dates
// look, and the reminders (design-v4 SettingsApp).
export function AppPreferencesSection({ today, reminders: initialReminders, habitReminders: initialHabitReminders, reminderNames, pushPublicKey }: AppPreferencesSectionProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { preference, setTheme, allowDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [reminders, setReminders] = useState(initialReminders);
  const [habitReminders, setHabitReminders] = useState(initialHabitReminders);
  const [readingReminders, setReadingReminders] = useState(false);
  const [prefs, setPrefs] = useState<DisplayPreferences>(user.preferences ?? DEFAULT_PREFERENCES);
  const readOnly = Boolean(user.impersonatedBy);
  const habitRows = habitReminders ? activeReminderRows(habitReminders.reminders, reminderNames, t, locale) : [];
  const digits = digitsInForce(prefs.digitStyle, locale);
  const month = () => formatDate(`${today}T06:00:00Z`, "MMM", locale);

  // The phone menu's rows land on #reminders or #numbers after Settings'
  // loading screen, which already used up the router's hash scroll.
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (anchor === REMINDERS_ANCHOR || anchor === NUMBERS_ANCHOR) document.getElementById(anchor)?.scrollIntoView({ block: "start" });
  }, []);

  // Saved as soon as it flips; put back if the save fails.
  function changeReminder(key: "budget" | "loans" | "savings" | "monthlySummaryEmail", on: boolean) {
    if (!reminders) return;
    const before = reminders;
    const next = { ...reminders, [key]: on };
    setReminders(next);
    saveReminderPreferencesAction(next).then((result) => {
      if (result.success) return;
      setReminders(before);
      toast.error(t(result.message ?? "Failed to save reminders"));
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
      const [result, habitResult] = await Promise.all([reminders ? null : getReminderPreferencesAction(), habitReminders ? null : getRemindersAction()]);
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

  // Saved to the account at once; the page reads the account again so every
  // place that shows the setting (the phone menu) follows.
  // Each change saves only its own setting, and its answer touches only
  // that setting: an earlier save answering late can't undo a quicker
  // second click, and a failure puts back just the setting that failed.
  function changePref<K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) {
    if (prefs[key] === value) return;
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    savePreferencesAction({ [key]: value }).then((result) => {
      if (result.success && result.data) {
        const saved = result.data[key];
        setPrefs((current) => (current[key] === value ? { ...current, [key]: saved } : current));
        router.refresh();
        return;
      }
      setPrefs((current) => (current[key] === value ? { ...current, [key]: previous } : current));
      toast.error(t(result.message ?? "Couldn't save your preference"));
    });
  }

  // From 576px of section the control sits beside its words; narrower, under
  // them. The section's width decides, not the window's.
  const row = (title: string, body: string, control: React.ReactNode, extra?: { soon?: string; id?: string; py?: string }) => (
    <div key={title} className={cn("flex flex-col gap-3 border-t border-divider @xl:flex-row @xl:items-center @xl:gap-5", PX, extra?.py ?? "py-3")}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={extra?.id} className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
          {t(title)}
          {extra?.soon && (
            <Chip tone="neutral" size="sm">
              {t(extra.soon)}
            </Chip>
          )}
        </span>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(body)}</span>
      </span>
      {control}
    </div>
  );

  const segments = <T extends string>(label: string, value: T, options: SegmentOption<T>[], onChange: (value: T) => void) => (
    <SegmentedControl<T> label={t(label)} variant="pill" size="touch" value={value} onChange={readOnly ? () => undefined : onChange} disabled={readOnly} className={SEGMENTS} options={options} />
  );

  const [weekFirst, weekLast] = weekRun(prefs.weekStart);
  const emailOff = reminders?.emailReady === false;

  return (
    <div className="flex flex-col gap-4.5">
      <Card padding="none" className="overflow-hidden">
        {/* With dark mode switched off there is no look to pick, only the language. */}
        <h2 className={cn("py-4 text-title font-semibold text-ink", PX)}>{allowDark ? t("Language and look") : t("Language")}</h2>
        {row(
          "Language",
          "Saved to your account, so every device opens in it.",
          segments<Locale>("Language", locale, [
            { value: "en", label: "English" },
            { value: "bn", label: <span lang="bn">বাংলা</span>, lang: "bn" },
          ], changeLanguage),
          { py: "py-3.5" },
        )}
        {allowDark &&
          row(
            "Theme",
            "Dark is easier on the eyes at night.",
            <SegmentedControl<ThemePreference>
              label={t("Theme")}
              variant="pill"
              size="touch"
              value={preference}
              onChange={setTheme}
              className={cn(SEGMENTS, "[&_svg]:size-3.5")}
              options={[
                { value: "light", label: t("Light"), icon: <Sun /> },
                { value: "dark", label: t("Dark"), icon: <Moon /> },
                { value: "system", label: t("Match device"), icon: <Monitor /> },
              ]}
            />,
            { py: "py-3.5" },
          )}
      </Card>

      <Card id={NUMBERS_ANCHOR} padding="none" className="scroll-mt-4 overflow-hidden">
        <div className={cn("flex flex-col gap-0.5 py-4", PX)}>
          <h2 className="text-title font-semibold text-ink">{t("Numbers and dates")}</h2>
          <span className="text-small text-ink-muted">{t("How amounts and dates look everywhere in the app.")}</span>
        </div>
        {row(
          "Digits",
          "English or Bangla numbers.",
          segments<DigitStyle>("Digits", digits, [
            { value: "LATIN", label: sampleNumber(123456, prefs.numberGrouping, "LATIN") },
            { value: "BENGALI", label: <span lang="bn">{sampleNumber(123456, prefs.numberGrouping, "BENGALI")}</span>, lang: "bn" },
          ], (value) => changePref("digitStyle", value)),
        )}
        {row(
          "Big amounts",
          "Lakh and crore, or groups of three.",
          segments<NumberGrouping>("Big amounts", prefs.numberGrouping, [
            { value: "LAKH", label: sampleAmount(123456, "LAKH", digits, locale) },
            { value: "INTERNATIONAL", label: sampleAmount(123456, "INTERNATIONAL", digits, locale) },
          ], (value) => changePref("numberGrouping", value)),
        )}
        {row(
          "Dates",
          "Used in lists, reports and statements.",
          segments<DateStyle>("Dates", prefs.dateStyle, DATE_STYLES.map((style) => ({ value: style, label: sampleDate(today, style, digits, month) })), (value) => changePref("dateStyle", value)),
        )}
        {row(
          "Week starts on",
          "For weekly budgets and the meal sheet.",
          segments<WeekStart>("Week starts on", prefs.weekStart, WEEK_STARTS.map((start) => ({ value: start, label: t(WEEK_START_LABEL[start]) })), (value) => changePref("weekStart", value)),
        )}
        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-divider bg-emerald-soft py-3", PX)} aria-live="polite">
          <span className="text-[12.5px] font-semibold text-emerald">{t("Preview@@format")}</span>
          <span className="text-[15px] font-semibold text-ink tabular-nums">{sampleAmount(123456, prefs.numberGrouping, digits, locale)}</span>
          <span className="text-ink-faint" aria-hidden="true">
            ·
          </span>
          <span className="text-[15px] font-semibold text-ink">
            {formatDate(`${today}T06:00:00Z`, "EEE", locale)}, {sampleDate(today, prefs.dateStyle, digits, month)}
          </span>
          <span className="text-ink-faint" aria-hidden="true">
            ·
          </span>
          <span className="text-small text-ink-soft">{t("Weeks run {first} to {last}", { first: t(weekFirst), last: t(weekLast) })}</span>
        </div>
      </Card>

      <Card id={REMINDERS_ANCHOR} padding="none" className="scroll-mt-4 overflow-hidden">
        <div className={cn("flex flex-col gap-0.5 py-4", PX)}>
          <h2 className="text-title font-semibold text-ink">{t("Reminders")}</h2>
          <span className="text-small text-ink-muted">{t("In the bell, and as notifications on the devices you turn them on for.")}</span>
        </div>
        {(reminders === null || habitReminders === null) && (
          <div role="alert" className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-warning-soft py-3 text-small text-warning", PX)}>
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
        {REMINDERS.map((item) => row(item.title, item.body, <SettingSwitch checked={reminders?.[item.key] ?? false} disabled={!reminders || readOnly} onCheckedChange={(on) => changeReminder(item.key, on)} aria-labelledby={`rem-${item.key}`} />, { id: `rem-${item.key}` }))}
        <PushDeviceRow publicKey={pushPublicKey} readOnly={readOnly} />
        {row(
          "Habit reminders",
          "Daily habits, challenges, to-dos, prayers, Sehri and Iftar, books and skills, at the times you set on each.",
          <SettingSwitch checked={habitReminders?.remindHabits ?? false} disabled={!habitReminders || readOnly} onCheckedChange={changeRemindHabits} aria-labelledby="rem-habits" />,
          { id: "rem-habits" },
        )}
        {habitReminders && (
          <div className={cn("flex flex-col gap-2 pb-4", PX)}>
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
        {row(
          "Monthly summary by email",
          emailOff ? "Income, spending and savings for last month. Your choice is saved now; the email starts once Smartly can send email." : "Income, spending and savings for last month.",
          <SettingSwitch checked={reminders?.monthlySummaryEmail ?? user.monthlySummaryEmail ?? false} disabled={!reminders || readOnly} onCheckedChange={(on) => changeReminder("monthlySummaryEmail", on)} aria-labelledby="rem-summary" />,
          { id: "rem-summary", soon: emailOff ? "Email not on yet" : undefined },
        )}
      </Card>
    </div>
  );
}
