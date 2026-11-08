"use client";

import { ChevronRight, CircleAlert, RotateCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import type { ReminderPreferences, RemindersOverview } from "@/lib/customer/api";
import { getReminderPreferencesAction, saveReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { activeReminderRows } from "@/lib/customer/reminderDisplay";
import { getRemindersAction, saveRemindHabitsAction } from "@/lib/customer/remindersActions";
import { REMINDERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD, SmallSwitch } from "./boardUi";
import { PushDeviceRow } from "./PushDeviceRow";

export interface RemindersCardProps {
  // null when they couldn't be read: the card says so, with Try again, and
  // the switches stay locked until they are read.
  reminders: ReminderPreferences | null;
  // Habit reminders (GET /api/reminders): the master switch and the saved ones.
  habitReminders: RemindersOverview | null;
  // What each habit reminder is about, by id (habit, challenge, book, skill).
  reminderNames: Record<string, string>;
  // The server's push key; null when push isn't set up there.
  pushPublicKey: string | null;
}

const PX = "px-5.5";

// Settings › Notifications: what the alerts above don't cover -- this
// device's push, the Habit Tracker's reminders and the monthly email.
export function RemindersCard({ reminders: initialReminders, habitReminders: initialHabitReminders, reminderNames, pushPublicKey }: RemindersCardProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [reminders, setReminders] = useState(initialReminders);
  const [habitReminders, setHabitReminders] = useState(initialHabitReminders);
  const [reading, setReading] = useState(false);
  const readOnly = Boolean(user.impersonatedBy);
  const habitRows = habitReminders ? activeReminderRows(habitReminders.reminders, reminderNames, t, locale) : [];
  const emailOff = reminders?.emailReady === false;

  function changeMonthly(on: boolean) {
    if (!reminders) return;
    const before = reminders;
    const next = { ...reminders, monthlySummaryEmail: on };
    setReminders(next);
    saveReminderPreferencesAction(next).then((result) => {
      if (result.success) return;
      setReminders(before);
      toast.error(t(result.message ?? "Failed to save reminders"));
    });
  }

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

  async function readAgain() {
    setReading(true);
    try {
      const [result, habitResult] = await Promise.all([reminders ? null : getReminderPreferencesAction(), habitReminders ? null : getRemindersAction()]);
      if (result?.success && result.data) setReminders(result.data);
      if (habitResult?.success && habitResult.data) setHabitReminders(habitResult.data);
      if ((result && !result.success) || (habitResult && !habitResult.success)) toast.error(t("Couldn't load your reminders."));
    } catch {
      toast.error(t("Couldn't load your reminders."));
    } finally {
      setReading(false);
    }
  }

  const row = (id: string, title: string, body: string, control: React.ReactNode, soon?: string) => (
    <div className={cn("flex items-center gap-4.5 border-t border-divider py-3.25", PX)}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={id} className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
          {t(title)}
          {soon && (
            <Chip tone="neutral" size="sm">
              {t(soon)}
            </Chip>
          )}
        </span>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(body)}</span>
      </span>
      {control}
    </div>
  );

  return (
    <section id={REMINDERS_ANCHOR} aria-labelledby="rem-h" className={cn(CARD, "scroll-mt-4 overflow-hidden")}>
      <div className={cn("flex flex-col gap-0.75 pt-4.5 pb-3.5", PX)}>
        <h2 id="rem-h" className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t("This device and the Habit Tracker")}
        </h2>
        <p className="text-small leading-normal text-ink-muted">{t("Notifications on this device, your habit reminders and the monthly email.")}</p>
      </div>
      {(reminders === null || habitReminders === null) && (
        <div role="alert" className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-warning-soft py-3 text-small text-warning", PX)}>
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t("Couldn't load your reminders.")}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void readAgain()} disabled={reading} className="pointer-coarse:h-11">
            {reading ? <Loader size={14} /> : <RotateCw aria-hidden="true" />}
            {t("Try again")}
          </Button>
        </div>
      )}
      <PushDeviceRow publicKey={pushPublicKey} readOnly={readOnly} />
      {row("rem-habits", "Habit reminders", "Daily habits, challenges, to-dos, prayers, Sehri and Iftar, books and skills, at the times you set on each.", <SmallSwitch on={habitReminders?.remindHabits ?? false} label={t("Habit reminders")} disabled={!habitReminders || readOnly} onClick={() => changeRemindHabits(!habitReminders?.remindHabits)} />)}
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
        "rem-summary",
        "Monthly summary by email",
        emailOff ? "Income, spending and savings for last month. Your choice is saved now; the email starts once Smartly can send email." : "Income, spending and savings for last month.",
        <SmallSwitch on={reminders?.monthlySummaryEmail ?? user.monthlySummaryEmail ?? false} label={t("Monthly summary by email")} disabled={!reminders || readOnly} onClick={() => changeMonthly(!(reminders?.monthlySummaryEmail ?? false))} />,
        emailOff ? "Email not on yet" : undefined,
      )}
    </section>
  );
}
