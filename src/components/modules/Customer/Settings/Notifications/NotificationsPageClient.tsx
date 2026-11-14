"use client";

import { ArrowRight, Bell, BellOff, CalendarDays, Clock, Gift, HandCoins, Info, Lock, Mail, Megaphone, MessageSquare, PiggyBank, RotateCcw, Send, ShieldCheck, Smartphone, Users, Wallet, ArrowLeftRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import StatePanel from "@/components/smartly/StatePanel";
import type { NotificationSettingsPage, NotifyChannel } from "@/lib/customer/notificationSettings";
import { type NotificationSettingsChange, saveNotificationSettingsAction } from "@/lib/customer/notificationSettingsActions";
import { sendTestPushAction } from "@/lib/customer/remindersActions";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../../Shared/PopupDialog";
import { BoardSegment, CARD, SELECT, SmallSwitch } from "../boardUi";
import { RemindersCard, type RemindersCardProps } from "../RemindersCard";
import { SettingsBack } from "../SettingsBack";

interface Row {
  key: string;
  label: string;
  help: string;
  pick?: "loan" | "event";
}

const GROUPS: { name: string; Icon: LucideIcon; tile: string; rows: Row[] }[] = [
  {
    name: "Money",
    Icon: Wallet,
    tile: "bg-mint-50 text-emerald",
    rows: [
      { key: "bigTx", label: "Big transaction recorded", help: "When one entry is ৳ 10,000 or more." },
      { key: "budget", label: "Budget almost used or over budget", help: "At 90% of a category budget, and again when it goes over." },
      { key: "income", label: "Income target reached", help: "When this month's income reaches your target." },
    ],
  },
  {
    name: "Loans",
    Icon: ArrowLeftRight,
    tile: "bg-tint-blue text-tint-blue-ink",
    rows: [
      { key: "loanDue", label: "Payment or profit due", help: "For loans you took and profit you pay.", pick: "loan" },
      { key: "collect", label: "Money to collect is due", help: "When someone's date to pay you back comes." },
    ],
  },
  {
    name: "Savings goals",
    Icon: PiggyBank,
    tile: "bg-warning-soft text-warning",
    rows: [
      { key: "goalCheck", label: "Monthly check-in", help: "On the 1st, how far each goal has come." },
      { key: "goalDone", label: "Goal reached", help: "When a goal is fully saved." },
    ],
  },
  {
    name: "Group Expense",
    Icon: Users,
    tile: "bg-tint-violet text-tint-violet-ink",
    rows: [
      { key: "grpEntry", label: "New entry in my groups", help: "When a member adds an expense or a deposit." },
      { key: "grpClose", label: "Month closed", help: "When the admin closes the month and shares are final." },
      { key: "grpSettle", label: "Settlement asks", help: "When someone asks you to pay or confirms your payment." },
    ],
  },
  { name: "Calendar & Events", Icon: CalendarDays, tile: "bg-tint-pink text-tint-pink-ink", rows: [{ key: "event", label: "Event reminders", help: "Birthdays, weddings and other events you saved.", pick: "event" }] },
  { name: "Zakat", Icon: HandCoins, tile: "bg-tint-green text-tint-green-ink", rows: [{ key: "zakat", label: "Zakat year due", help: "When a lunar year passes from your nisab date." }] },
  {
    name: "Referrals",
    Icon: Gift,
    tile: "bg-tint-orange text-tint-orange-ink",
    rows: [
      { key: "refSign", label: "New signup", help: "When someone joins with your link." },
      { key: "refEarn", label: "Earning ready", help: "When a referral earning can be withdrawn." },
    ],
  },
  {
    name: "Account & security",
    Icon: ShieldCheck,
    tile: "bg-expense-soft text-expense",
    rows: [
      { key: "device", label: "New device sign-in", help: "In app and email stay on for your safety." },
      { key: "pwd", label: "Password changed", help: "In app and email stay on for your safety." },
    ],
  },
  { name: "Product", Icon: Megaphone, tile: "bg-surface-sunken text-ink-soft", rows: [{ key: "news", label: "News and tips", help: "New features and money tips, about once a month." }] },
];

const COLUMNS: { channel: NotifyChannel; label: string; Icon: LucideIcon; note: string; tone: string }[] = [
  { channel: "app", label: "In app", Icon: Bell, note: "Bell at the top", tone: "bg-surface-sunken text-ink-soft" },
  { channel: "email", label: "Email", Icon: Mail, note: "To your inbox", tone: "bg-surface-sunken text-ink-soft" },
  { channel: "sms", label: "SMS", Icon: MessageSquare, note: "Costs nothing extra", tone: "bg-success-soft text-tint-green-ink" },
  { channel: "push", label: "Push", Icon: Smartphone, note: "Mobile app only", tone: "bg-warning-soft text-warning" },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const DAYS = [
  ["sun", "Sunday"],
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
] as const;

const GRID = "grid grid-cols-[minmax(0,1fr)_repeat(4,108px)] items-center";

// The SettingsNotifications board: every alert on or off in the bell,
// email, SMS (Pro) and push, saved as each is switched; quiet hours, the
// summary, where things go and a test push.
export function NotificationsPageClient({ initial, today, reminderProps }: { initial: NotificationSettingsPage | null; today: string; reminderProps?: RemindersCardProps }) {
  const { t, fmt } = useLocale();
  const [page, setPage] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"off" | "reset" | null>(null);

  if (!page) {
    return (
      <PageFrame className="gap-5 leading-[normal]">
        <h1 className="text-page-title text-ink">{t("Notifications")}</h1>
        <StatePanel icon={<Bell />} tone="warning" title={t("Couldn't load your notification settings.")} description={t("Check your connection and try again.")} />
      </PageFrame>
    );
  }
  const { prefs } = page;
  const locked = (key: string, channel: NotifyChannel) => page.locked[key]?.includes(channel) ?? false;

  async function save(change: NotificationSettingsChange, message?: string, undo?: NotificationSettingsChange) {
    if (busy) return;
    setBusy(true);
    const result = await saveNotificationSettingsAction(change).catch(() => null);
    setBusy(false);
    if (!result?.success || !result.data) return void toast.error(t(result?.message ?? "Couldn't save your notification settings."));
    setPage(result.data);
    if (message) toast.success(t(message), undo ? { action: { label: t("Undo"), onClick: () => void save(undo, "Undone") } } : undefined);
  }

  const everything = (on: (key: string, channel: NotifyChannel) => boolean) =>
    Object.fromEntries(GROUPS.flatMap((group) => group.rows).map((row) => [row.key, Object.fromEntries(COLUMNS.map((column) => [column.channel, on(row.key, column.channel)]))]));
  const asWas: NotificationSettingsChange = {
    alerts: everything((key, channel) => prefs.alerts[key]?.[channel] ?? false),
    summaryMode: prefs.summary.mode,
  };

  const nextSummary = () => {
    const [hour, minute] = prefs.summary.time.split(":").map(Number);
    const base = new Date(`${today}T00:00:00Z`);
    for (let add = 0; add < 8; add += 1) {
      const day = new Date(base.getTime() + add * 86_400_000);
      if (prefs.summary.mode === "weekly" && DAYS[day.getUTCDay()][0] !== prefs.summary.day) continue;
      if (add === 0 && hour * 60 + minute <= new Date().getHours() * 60 + new Date().getMinutes()) continue;
      return day.toISOString().slice(0, 10);
    }
    return today;
  };

  return (
    <PageFrame className="gap-5.5 leading-[normal] md:pt-7 md:pb-10">
      <div className="flex items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SettingsBack />
          <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Notifications")}</h1>
          <p className="text-body text-ink-muted">{t("Choose what Smartly tells you about, and where it reaches you.")}</p>
        </div>
        <span className="flex h-7 shrink-0 items-center rounded-full bg-soft-wash px-3 text-[12.5px] font-semibold text-emerald">{t("{on} of {total} turned on", { on: formatCount(page.on, fmt), total: formatCount(page.total, fmt) })}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="@container flex min-w-0 flex-col gap-5">
        <section aria-labelledby="nt-m" className={cn(CARD, "overflow-x-auto")}>
          <div className="flex flex-wrap items-start justify-between gap-4 px-5.5 pt-4.5 pb-3.5">
            <div>
              <h2 id="nt-m" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("What to tell me")}
              </h2>
              <p className="mt-[3px] text-[13px] leading-[1.5] text-ink-muted">{t("Turn each alert on or off for each place. Changes save right away.")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setConfirm("off")} disabled={busy} className="flex h-8.5 items-center gap-1.75 rounded-full border border-input bg-surface px-3.75 text-small font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
                <BellOff className="size-3.5" aria-hidden="true" />
                {t("Turn all off")}
              </button>
              <button type="button" onClick={() => setConfirm("reset")} disabled={busy} className="flex h-8.5 items-center gap-1.75 rounded-full border border-input bg-surface px-3.75 text-small font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t("Reset to default")}
              </button>
            </div>
          </div>
          <div role="table" aria-label={t("What to tell me")} className="min-w-[680px]">
            <div role="row" className={cn(GRID, "border-y border-line-card bg-surface px-5.5 py-2.5")}>
              <span role="columnheader" className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">
                {t("Alert")}
              </span>
              {COLUMNS.map((column) => (
                <span role="columnheader" key={column.channel} className="flex flex-col items-center gap-[3px] text-center">
                  <span className="flex items-center gap-1.25 text-small font-semibold text-ink">
                    <column.Icon className="size-3.5" aria-hidden="true" />
                    {t(column.label)}
                  </span>
                  <span className={cn("flex h-4.5 items-center rounded-full px-1.75 text-[10.5px] font-semibold whitespace-nowrap", column.channel === "sms" && !page.pro ? "bg-forest text-white" : column.tone)}>
                    {column.channel === "sms" && !page.pro ? t("Pro only") : t(column.note)}
                  </span>
                </span>
              ))}
            </div>
            {GROUPS.map((group) => (
              <div key={group.name} role="rowgroup">
                <div role="row" className="flex items-center gap-2.25 border-b border-sunken bg-soft-row px-5.5 py-2.5">
                  <span className={cn("flex size-6.5 shrink-0 items-center justify-center rounded-[8px]", group.tile)}>
                    <group.Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span role="rowheader" className="text-[13px] font-semibold text-ink-2">
                    {t(group.name)}
                  </span>
                </div>
                {group.rows.map((row) => (
                  <div key={row.key} role="row" className={cn(GRID, "border-b border-sunken px-5.5 py-3 hover:bg-row-hover")}>
                    <span role="cell" className="flex min-w-0 flex-col gap-[3px] pr-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-body font-medium text-ink">{t(row.label)}</span>
                        {page.locked[row.key] && (
                          <span className="flex h-5 shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-2 text-[11px] font-semibold text-ink-soft">
                            <Lock className="size-3" aria-hidden="true" />
                            {t("Always on")}
                          </span>
                        )}
                      </span>
                      <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(row.help)}</span>
                      {row.pick && (
                        <span className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-2">
                          <span>{t("Remind me")}</span>
                          <select
                            aria-label={t("How early")}
                            value={row.pick === "loan" ? prefs.loanDaysBefore : prefs.eventDaysBefore}
                            onChange={(event) => void save(row.pick === "loan" ? { loanDaysBefore: Number(event.target.value) } : { eventDaysBefore: Number(event.target.value) }, "Saved")}
                            className={cn(SELECT, "h-7.5 text-[12.5px]")}
                          >
                            {(row.pick === "loan" ? [1, 3, 7] : [1, 2, 3, 7]).map((days) => (
                              <option key={days} value={days}>
                                {days === 1 ? t("1 day before") : t("{count} days before", { count: toLocaleDigits(String(days), fmt) })}
                              </option>
                            ))}
                          </select>
                        </span>
                      )}
                    </span>
                    {COLUMNS.map((column) => {
                      const on = prefs.alerts[row.key]?.[column.channel] ?? false;
                      const fixed = locked(row.key, column.channel);
                      const proOnly = column.channel === "sms" && !page.pro;
                      return (
                        <span key={column.channel} role="cell" className="flex justify-center">
                          <SmallSwitch
                            on={on && !proOnly}
                            label={`${t(row.label)}: ${t(column.label)}`}
                            title={fixed ? t("Stays on for your safety") : proOnly ? t("SMS alerts come with Pro") : undefined}
                            disabled={fixed || proOnly || busy}
                            onClick={() => void save({ alerts: { [row.key]: { [column.channel]: !on } } })}
                          />
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex items-start gap-2.5 px-5.5 pt-3.5 pb-4.5 text-[12.5px] leading-normal text-ink-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{t("Security alerts always reach you in the app and by email. SMS alerts come with Pro; push needs the Smartly app or this browser's notifications turned on.")}</span>
            </div>
          </div>
        </section>
        {reminderProps && <RemindersCard {...reminderProps} />}
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-0">
          <section aria-labelledby="nt-q" className={cn(CARD, "flex flex-col gap-3.5 px-5.5 pt-4.5 pb-4.5")}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="nt-q" className="text-[16px] leading-[1.35] font-semibold text-ink">
                  {t("Quiet hours")}
                </h2>
                <p className="mt-[3px] text-[13px] leading-[1.5] text-ink-muted">{t("No SMS or push in this time. Alerts wait in the bell. Security alerts still come.")}</p>
              </div>
              <SmallSwitch on={prefs.quiet.on} label={t("Quiet hours")} disabled={busy} onClick={() => void save({ quietOn: !prefs.quiet.on }, "Saved")} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(["from", "to"] as const).map((end) => (
                <label key={end} className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-ink-2">{t(end === "from" ? "From" : "To@@date")}</span>
                  <select value={prefs.quiet[end]} disabled={!prefs.quiet.on || busy} onChange={(event) => void save(end === "from" ? { quietFrom: event.target.value } : { quietTo: event.target.value }, "Saved")} className={cn(SELECT, "h-9")}>
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {toLocaleDigits(hour, fmt)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="nt-s" className={cn(CARD, "flex flex-col gap-3 px-5.5 pt-4.5 pb-4.5")}>
            <div>
              <h2 id="nt-s" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Daily or weekly summary")}
              </h2>
              <p className="mt-[3px] mb-0.5 text-[13px] leading-[1.5] text-ink-muted">{t("A short email: money in, money out and what is due next.")}</p>
            </div>
            <BoardSegment value={prefs.summary.mode} label={t("Daily or weekly summary")} disabled={busy} onChange={(mode) => void save({ summaryMode: mode }, "Saved")} options={[{ value: "off", label: "Off" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} />
            {prefs.summary.mode !== "off" && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-ink-2">{t("On@@day")}</span>
                    <select value={prefs.summary.day} disabled={prefs.summary.mode !== "weekly" || busy} onChange={(event) => void save({ summaryDay: event.target.value }, "Saved")} className={cn(SELECT, "h-9")}>
                      {DAYS.map(([value, name]) => (
                        <option key={value} value={value}>
                          {t(name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-ink-2">{t("At@@time")}</span>
                    <select value={prefs.summary.time} disabled={busy} onChange={(event) => void save({ summaryTime: event.target.value }, "Saved")} className={cn(SELECT, "h-9")}>
                      {HOURS.map((hour) => (
                        <option key={hour} value={hour}>
                          {toLocaleDigits(hour, fmt)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  <Clock className="size-3.5 text-emerald" aria-hidden="true" />
                  {t("Next one: {day} at {time}", { day: formatDay(nextSummary(), "EEEE, d MMMM yyyy", fmt), time: toLocaleDigits(prefs.summary.time, fmt) })}
                </span>
              </>
            )}
          </section>

          <section aria-labelledby="nt-w" className={cn(CARD, "overflow-hidden")}>
            <h2 id="nt-w" className="px-5.5 pt-4.5 pb-1.5 text-[16px] leading-[1.35] font-semibold text-ink">
              {t("Where we send")}
            </h2>
            {[
              { Icon: Mail, label: "Email", value: page.destinations.email },
              { Icon: MessageSquare, label: "Phone for SMS", value: page.destinations.phone ?? t("No phone added yet") },
              { Icon: Smartphone, label: "Push", value: page.destinations.devices.length ? t("{count} devices", { count: formatCount(page.destinations.devices.length, fmt) }) : t("No device yet") },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 border-t border-sunken px-5.5 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-page text-ink-2">
                  <row.Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[12px] text-ink-muted">{t(row.label)}</span>
                  <span className="truncate text-[13.5px] font-semibold text-ink">{row.value}</span>
                </span>
              </div>
            ))}
            <div className="flex flex-col gap-3 border-t border-sunken px-5.5 pt-3 pb-4.5">
              <Link href="/settings/profile" className="inline-flex items-center gap-1 text-small font-semibold text-emerald hover:underline">
                {t("Change them in Profile")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const result = await sendTestPushAction().catch(() => null);
                  if (!result?.success) return void toast.error(t(result?.message ?? "Couldn't send a test notification"));
                  toast.success(result.data?.sent ? t("Test sent to {count} devices", { count: formatCount(result.data.sent, fmt) }) : t("No device to send to yet. Turn on push in App preferences."));
                }}
                className="flex h-9.5 items-center justify-center gap-2 rounded-full bg-primary text-[13.5px] font-semibold text-primary-foreground hover:bg-emerald-hover"
              >
                <Send className="size-4" aria-hidden="true" />
                {t("Send a test notification")}
              </button>
            </div>
          </section>
        </div>
      </div>

      {confirm && (
        <PopupDialog
          open
          plain
          width={460}
          busy={busy}
          onClose={() => setConfirm(null)}
          title={t(confirm === "off" ? "Turn every alert off?" : "Reset to default?")}
          sub={t(
            confirm === "off"
              ? "You will stop hearing about budgets, dues, goals and groups, and the summary stops. Security alerts stay on. You can undo this right after."
              : "Every alert, quiet hours and the summary go back to how Smartly set them at the start.",
          )}
          footer={
            <>
              <button type="button" onClick={() => setConfirm(null)} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken">
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const kind = confirm;
                  setConfirm(null);
                  void (kind === "off" ? save({ alerts: everything(() => false), summaryMode: "off" }, "Every alert is off", asWas) : save({ reset: true }, "Back to the defaults", asWas));
                }}
                className={cn("h-10.5 rounded-full px-5 text-body font-semibold text-white", confirm === "off" ? "bg-expense-fill hover:bg-expense" : "bg-primary hover:bg-emerald-hover")}
              >
                {t(confirm === "off" ? "Turn all off" : "Reset")}
              </button>
            </>
          }
        />
      )}
    </PageFrame>
  );
}
