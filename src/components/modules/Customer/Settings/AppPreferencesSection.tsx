"use client";

import { ArrowRight, Bell, Eye, Keyboard, Lock, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { useTheme, type ThemePreference } from "@/components/modules/Customer/Providers/ThemeProvider";
import Button from "@/components/smartly/Button";
import Kbd from "@/components/smartly/Kbd";
import PageFrame from "@/components/smartly/PageFrame";
import { saveAppLock } from "@/lib/customer/appLock";
import type { Account, DateStyle, DigitStyle, DisplayPreferences, NumberGrouping, StartPage, WeekStart } from "@/lib/customer/api";
import { saveLanguageAction } from "@/lib/customer/authActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { setDefaultAccountAction } from "@/lib/customer/quickEntryActions";
import { savePreferencesAction } from "@/lib/customer/securityActions";
import { DATE_STYLES, DEFAULT_PREFERENCES, digitsInForce, sampleAmount, sampleDate, sampleNumber, WEEK_START_LABEL, WEEK_STARTS } from "@/lib/customer/securityDisplay";
import { NUMBERS_ANCHOR } from "@/lib/customer/settingsDisplay";
import { sidebarCookie } from "@/lib/customer/sidebarState";
import { formatDay } from "@/lib/date";
import { resolveFmt, takaSign } from "@/lib/i18n/formatPrefs";
import { useLocale, type Locale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { BoardSegment, CARD, SELECT, SmallSwitch } from "./boardUi";
import { SettingsBack } from "./SettingsBack";
import { useAppLock } from "./useAppLock";

interface AppPreferencesSectionProps {
  today: string;
  // The open workspace's wallets, for the default one; null when there is
  // no workspace to add entries to.
  businessId: string | null;
  wallets: Account[];
  // Today in the Hijri calendar, for the preview.
  hijri: string;
}

type Prefs = Required<DisplayPreferences>;

const START_PAGES: { value: StartPage; label: string }[] = [
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "REPORTS", label: "Reports" },
  { value: "INCOME_EXPENSE", label: "Income & Expense" },
  { value: "GROUP", label: "Group Expense" },
  { value: "CALENDAR", label: "Calendar" },
];
const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Anywhere",
    items: [
      { keys: ["Ctrl", "K"], label: "Open search and jump to a page" },
      { keys: ["/"], label: "Put the cursor in search" },
      { keys: ["Esc"], label: "Close the open popup" },
      { keys: ["?"], label: "Show this list" },
    ],
  },
  {
    group: "Money",
    items: [
      { keys: ["N"], label: "Add a new transaction" },
      { keys: ["Enter"], label: "Save the open form" },
    ],
  },
];
// The board's key cap: 26px high, a 2px bottom edge.
const KBD = "h-6.5 min-w-6.5 justify-center rounded-[7px] border-input border-b-2 px-1.75 py-0 text-[12px] font-semibold text-ink-2";
// The four the card lists without opening the popup.
const SHORT_KEYS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search" },
  { keys: ["N"], label: "New transaction" },
  { keys: ["Esc"], label: "Close a popup" },
  { keys: ["/"], label: "Focus search" },
];

// The SettingsApp board: language and look, numbers and dates, money,
// start and layout, the calendar, and the keyboard shortcuts; beside them
// a live preview, and where the reminders went (Notifications). Each
// choice is saved to the account as it is picked; Reset puts them all back
// but the language.
export function AppPreferencesSection({ today, businessId, wallets, hijri }: AppPreferencesSectionProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { preference, setTheme, allowDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const lock = useAppLock(user.id);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFERENCES, ...user.preferences });
  const [resetOpen, setResetOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const readOnly = Boolean(user.impersonatedBy);
  const digits = digitsInForce(prefs.digitStyle, locale);
  const month = () => formatDate(`${today}T06:00:00Z`, "MMM", locale);
  const defaultAccountId = user.businesses.find((business) => business.id === businessId)?.defaultAccountId ?? null;
  const fmt = resolveFmt(prefs, locale);

  // The phone menu's Numbers row lands on #numbers after Settings' loading
  // screen, which already used up the router's hash scroll; "?" opens the
  // shortcuts.
  useEffect(() => {
    if (window.location.hash.slice(1) === NUMBERS_ANCHOR) document.getElementById(NUMBERS_ANCHOR)?.scrollIntoView({ block: "start" });
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "?" && !target?.closest("input, textarea, select, [contenteditable]")) setKeysOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function changeLanguage(next: Locale) {
    if (next === locale) return;
    toggleLocale();
    saveLanguageAction(next === "bn" ? "BN" : "EN").then((result) => {
      if (!result.success) toast.error(result.message ?? t("Failed to save language"));
    });
  }

  // Each change saves only its own setting, and its answer touches only
  // that setting: an earlier save answering late can't undo a quicker
  // second click, and a failure puts back just the setting that failed.
  function changePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    if (prefs[key] === value || readOnly) return;
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    // The sidebar's own fold follows the new default at once.
    if (key === "sidebarCollapsed") document.cookie = sidebarCookie(Boolean(value));
    savePreferencesAction({ [key]: value }).then((result) => {
      if (result.success && result.data) {
        router.refresh();
        return;
      }
      setPrefs((current) => (current[key] === value ? { ...current, [key]: previous } : current));
      toast.error(t(result.message ?? "Couldn't save your preference"));
    });
  }

  async function reset() {
    setResetOpen(false);
    const before = prefs;
    const changes = Object.fromEntries(Object.entries(DEFAULT_PREFERENCES).filter(([key, value]) => prefs[key as keyof Prefs] !== value)) as Partial<Prefs>;
    if (Object.keys(changes).length === 0) return void toast(t("Already at the defaults"));
    setPrefs(DEFAULT_PREFERENCES);
    if (preference !== "light") setTheme("light");
    document.cookie = sidebarCookie(false);
    const result = await savePreferencesAction(changes);
    if (!result.success) {
      setPrefs(before);
      return void toast.error(t(result.message ?? "Couldn't save your preference"));
    }
    router.refresh();
    toast.success(t("Back to the default preferences"), {
      action: {
        label: t("Undo"),
        onClick: () => {
          setPrefs(before);
          void savePreferencesAction(Object.fromEntries(Object.keys(changes).map((key) => [key, before[key as keyof Prefs]]))).then(() => router.refresh());
        },
      },
    });
  }

  async function changeDefaultAccount(accountId: string) {
    if (!businessId || readOnly) return;
    const result = await setDefaultAccountAction(businessId, accountId || null);
    if (!result.success) return void toast.error(t(result.message ?? "Couldn't save your default account"));
    toast.success(t("Saved"));
    router.refresh();
  }

  const row = (title: string, body: string, control: React.ReactNode) => (
    <div key={title} className="flex flex-col gap-3 border-t border-divider px-5.5 py-3.25 @xl:flex-row @xl:items-center @xl:gap-5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-ink">{t(title)}</span>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(body)}</span>
      </span>
      {control}
    </div>
  );
  // A row whose help is already in words (filled in).
  const rowWith = (title: string, help: string, control: React.ReactNode) => (
    <div key={title} className="flex flex-col gap-3 border-t border-divider px-5.5 py-3.25 @xl:flex-row @xl:items-center @xl:gap-5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-ink">{t(title)}</span>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{help}</span>
      </span>
      {control}
    </div>
  );
  const card = (id: string, title: string, sub: string, rows: React.ReactNode) => (
    <section id={id} aria-labelledby={`${id}-h`} className={cn(CARD, "scroll-mt-4 overflow-hidden")}>
      <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
        <h2 id={`${id}-h`} className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t(title)}
        </h2>
        <p className="text-small leading-normal text-ink-muted">{t(sub)}</p>
      </div>
      {rows}
    </section>
  );
  const seg = <T extends string>(label: string, value: T, options: { value: T; label: string }[], onChange: (value: T) => void) => <BoardSegment value={value} label={t(label)} options={options} disabled={readOnly} onChange={onChange} className="self-start @xl:self-center" />;
  const sw = (label: string, on: boolean, onClick: () => void) => <SmallSwitch on={on} label={t(label)} disabled={readOnly} onClick={onClick} />;
  const select = (label: string, value: string, options: { value: string; label: string }[], onChange: (value: string) => void, disabled = false) => (
    <select aria-label={t(label)} value={value} disabled={readOnly || disabled} onChange={(event) => onChange(event.target.value)} className={cn(SELECT, "h-9.5 w-full @xl:w-50")}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {t(option.label)}
        </option>
      ))}
    </select>
  );

  const weekStartIndex = { SATURDAY: 6, SUNDAY: 0, MONDAY: 1 }[prefs.weekStart];
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekFrom = new Date(todayDate.getTime() - ((todayDate.getUTCDay() - weekStartIndex + 7) % 7) * 86_400_000).toISOString().slice(0, 10);
  const weekTo = new Date(new Date(`${weekFrom}T00:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  const year = Number(today.slice(0, 4));
  const fyStartYear = prefs.fiscalYearStart === "JULY" && Number(today.slice(5, 7)) < 7 ? year - 1 : year;
  const fyFrom = prefs.fiscalYearStart === "JULY" ? `${fyStartYear}-07-01` : `${year}-01-01`;
  const fyTo = prefs.fiscalYearStart === "JULY" ? `${fyStartYear + 1}-06-30` : `${year}-12-31`;
  const sample = [
    { name: "Bazar at Karwan Bazar", meta: wallets[0]?.name ?? "Cash", day: today, amount: -2350 },
    { name: "Salary for October", meta: wallets[1]?.name ?? "Bank", day: `${today.slice(0, 7)}-01`, amount: 85000 },
    { name: "Electricity bill", meta: "bKash", day: today, amount: -1840.75 },
  ];

  return (
    <PageFrame className="md:pt-7 md:pb-10 gap-5.5 leading-[normal]">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <SettingsBack />
          <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("App preferences")}</h1>
          <p className="text-body text-ink-muted">{t("Language, look, numbers and how Smartly opens for you.")}</p>
        </div>
        <Button variant="secondary" size="sm" className="h-9.5 px-3.75 text-[13.5px]" disabled={readOnly} onClick={() => setResetOpen(true)}>
          <RotateCcw className="size-3.75" aria-hidden="true" />
          {t("Reset to default")}
        </Button>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="@container flex min-w-0 flex-col gap-4.5">
          {card(
            "sa-look",
            allowDark ? "Language and look" : "Language",
            "Saved to your account, so every device opens the same way.",
            <>
              {row(
                "Language",
                "Changes the app right away. Your own entries stay as you typed them.",
                <BoardSegment
                  value={locale}
                  label={t("Language")}
                  className="self-start @xl:self-center"
                  onChange={changeLanguage}
                  options={[
                    { value: "en", label: "English" },
                    { value: "bn", label: "বাংলা" },
                  ]}
                />,
              )}
              {allowDark &&
                row(
                  "Theme",
                  "Dark is easier on the eyes at night.",
                  <div role="radiogroup" aria-label={t("Theme")} className="flex shrink-0 gap-0.5 self-start rounded-full bg-page p-[3px] @xl:self-center">
                    {(
                      [
                        ["light", "Light", <Sun key="s" />],
                        ["dark", "Dark", <Moon key="m" />],
                        ["system", "Match device", <Monitor key="d" />],
                      ] as [ThemePreference, string, React.ReactNode][]
                    ).map(([value, label, icon]) => (
                      <button key={value} type="button" role="radio" aria-checked={preference === value} onClick={() => setTheme(value)} className={cn("flex h-8 items-center gap-1.5 rounded-full px-3.25 text-small whitespace-nowrap [&_svg]:size-3.5", preference === value ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "font-medium text-ink-2 hover:text-ink")}>
                        {icon}
                        {t(label)}
                      </button>
                    ))}
                  </div>,
                )}
            </>,
          )}

          {card(
            NUMBERS_ANCHOR,
            "Numbers and dates",
            "How amounts and dates look everywhere in the app.",
            <>
              {row(
                "Digits",
                "English or Bangla numbers.",
                seg<DigitStyle>(
                  "Digits",
                  digits,
                  [
                    { value: "LATIN", label: sampleNumber(123456, prefs.numberGrouping, "LATIN") },
                    { value: "BENGALI", label: sampleNumber(123456, prefs.numberGrouping, "BENGALI") },
                  ],
                  (value) => changePref("digitStyle", value),
                ),
              )}
              {row(
                "Big amounts",
                "Lakh and crore, or groups of three.",
                seg<NumberGrouping>(
                  "Big amounts",
                  prefs.numberGrouping,
                  [
                    { value: "LAKH", label: sampleAmount(123456, "LAKH", digits, locale) },
                    { value: "INTERNATIONAL", label: sampleAmount(123456, "INTERNATIONAL", digits, locale) },
                  ],
                  (value) => changePref("numberGrouping", value),
                ),
              )}
              {row(
                "Dates",
                "Used in lists, reports and statements.",
                seg<DateStyle>(
                  "Dates",
                  prefs.dateStyle,
                  DATE_STYLES.map((style) => ({ value: style, label: sampleDate(today, style, digits, month) })),
                  (value) => changePref("dateStyle", value),
                ),
              )}
              {row(
                "Week starts on",
                "For weekly budgets and the meal sheet.",
                seg<WeekStart>(
                  "Week starts on",
                  prefs.weekStart,
                  WEEK_STARTS.map((start) => ({ value: start, label: WEEK_START_LABEL[start] })),
                  (value) => changePref("weekStart", value),
                ),
              )}
            </>,
          )}

          {card(
            "sa-money",
            "Money",
            "Defaults for new entries and how balances show.",
            <>
              {row(
                "Default account for new transactions",
                "Picked for you when you add income or expense.",
                select(
                  "Default account for new transactions",
                  defaultAccountId ?? "",
                  [{ value: "", label: wallets[0] ? t("The first wallet ({name})", { name: wallets[0].name }) : "No wallet yet" }, ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))],
                  (value) => void changeDefaultAccount(value),
                  !businessId || wallets.length === 0,
                ),
              )}
              {row("Hide balances when the app opens", "Handy in public. Tap the eye to show them. On this device.", sw("Hide balances when the app opens", lock.hide, () => saveAppLock(user.id, { ...lock, hide: !lock.hide })))}
              {rowWith("Round amounts to whole taka", t("Shows {whole} instead of {exact}. Saved amounts do not change.", { whole: formatCurrency(1841, "BDT", locale), exact: formatCurrency(1840.75, "BDT", locale) }), sw("Round amounts to whole taka", prefs.roundAmounts, () => changePref("roundAmounts", !prefs.roundAmounts)))}
              {row(
                "Currency",
                "Smartly works in Bangladeshi taka only.",
                <span className="inline-flex h-9.5 shrink-0 items-center gap-2.5 self-start rounded-[10px] border border-dashed border-input bg-strip px-3 text-[13.5px] font-semibold text-ink-2 @xl:self-center">
                  {t("BDT · Taka ({sign})", { sign: takaSign(locale) })}
                  <span className="inline-flex h-5 items-center gap-1 rounded-full bg-page px-2 text-[11px] font-semibold text-ink-muted dark:bg-sunken">
                    <Lock className="size-3" aria-hidden="true" />
                    {t("Fixed")}
                  </span>
                </span>,
              )}
            </>,
          )}

          {card(
            "sa-start",
            "Start and layout",
            "What you see first and how lists fit on screen.",
            <>
              {row("First page after sign-in", "Where Smartly opens for you.", select("First page after sign-in", prefs.startPage, START_PAGES, (value) => changePref("startPage", value as StartPage)))}
              {row(
                "Rows per page",
                "In transactions and other long lists.",
                seg<"10" | "20" | "50">(
                  "Rows per page",
                  String(prefs.rowsPerPage) as "10" | "20" | "50",
                  [
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                  ],
                  (value) => changePref("rowsPerPage", Number(value)),
                ),
              )}
              {row("Compact tables", "Less space between rows, so more fits on screen.", sw("Compact tables", prefs.compactTables, () => changePref("compactTables", !prefs.compactTables)))}
              {row("Sidebar starts collapsed", "Only icons show until you open it.", sw("Sidebar starts collapsed", prefs.sidebarCollapsed, () => changePref("sidebarCollapsed", !prefs.sidebarCollapsed)))}
            </>,
          )}

          {card(
            "sa-cal",
            "Calendar",
            "Used for yearly reports, zakat and events.",
            <>
              {row(
                "Financial year starts",
                "July matches the Bangladesh tax year.",
                seg<"JANUARY" | "JULY">(
                  "Financial year starts",
                  prefs.fiscalYearStart,
                  [
                    { value: "JANUARY", label: "January" },
                    { value: "JULY", label: "July (Bangladesh tax year)" },
                  ],
                  (value) => changePref("fiscalYearStart", value),
                ),
              )}
              {row("Show Hijri date next to dates", "Helps with Ramadan, Eid and zakat planning.", sw("Show Hijri date next to dates", prefs.showHijri, () => changePref("showHijri", !prefs.showHijri)))}
            </>,
          )}

          <section aria-labelledby="sa-keys" className={cn(CARD, "overflow-hidden")}>
            <div className="flex flex-wrap items-center gap-4 px-5.5 pt-4.5 pb-3.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                <h2 id="sa-keys" className="text-[16px] leading-[1.35] font-semibold text-ink">
                  {t("Keyboard shortcuts")}
                </h2>
                <span className="text-[13px] leading-[1.5] text-ink-muted">{t("Work faster on a computer.")}</span>
              </span>
              <Button variant="secondary" className="h-9.5 gap-1.75 px-3.75 text-[13.5px]" onClick={() => setKeysOpen(true)}>
                <Keyboard className="size-4" aria-hidden="true" />
                {t("Show shortcuts")}
              </Button>
            </div>
            <div className="grid border-t border-sunken @xl:grid-cols-2">
              {SHORT_KEYS.map((item) => (
                <div key={item.label} className="flex items-center gap-3 border-b border-sunken px-5.5 py-3">
                  <span className="flex min-w-18.5 gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key} className={KBD}>{key}</Kbd>
                    ))}
                  </span>
                  <span className="text-[13.5px] text-ink-2">{t(item.label)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-4">
          <section aria-labelledby="sa-pv" className={cn(CARD, "flex flex-col overflow-hidden")} aria-live="polite">
            <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-2.5">
            <div className="flex items-center gap-2">
              <h2 id="sa-pv" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Preview")}
              </h2>
              <span className="inline-flex h-5 items-center gap-1 rounded-full bg-soft-wash px-2 text-[11px] font-semibold text-emerald">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald" />
                {t("Live")}
              </span>
            </div>
            <span className="text-[13px] leading-[1.5] text-ink-muted">{t("Changes here show up as you pick them.")}</span>
            </div>
            <div className="mx-5.5 flex flex-col gap-1 rounded-[14px] bg-soft-wash p-4">
              <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                {t("Total balance")}
                <Eye className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-[26px] font-bold tracking-[-0.02em] text-ink tabular-nums">{lock.hide ? "•••••" : formatCurrency(123456.5, "BDT", fmt)}</span>
              <span className="text-[12px] text-ink-muted">{t(lock.hide ? "Hidden when the app opens" : prefs.roundAmounts ? "Rounded to whole taka" : "With paisa")}</span>
            </div>
            <dl className="flex flex-col px-5.5 pt-1.5 pb-1">
              {[
                ["Today", formatDay(today, "EEEE, d MMMM yyyy", fmt)],
                ...(prefs.showHijri ? [["Hijri", hijri]] : []),
                ["This week", t("{from} to {to}", { from: formatDay(weekFrom, "EEEE d MMMM", fmt), to: formatDay(weekTo, "EEEE d MMMM", fmt) })],
                ["Financial year", t("{from} to {to}", { from: formatDay(fyFrom, "d MMMM yyyy", fmt), to: formatDay(fyTo, "d MMMM yyyy", fmt) })],
              ].map(([label, value], index) => (
                <div key={label} className={cn("flex items-baseline justify-between gap-3 py-2.5", index > 0 && "border-t border-dashed border-line")}>
                  <dt className="shrink-0 text-[12.5px] text-ink-muted">{t(label)}</dt>
                  <dd className="text-right text-[13.5px] font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mx-5.5 mt-1 mb-4.5 overflow-hidden rounded-[12px] border border-line">
              <div className="flex items-center justify-between bg-strip px-3 py-1.75 text-[11.5px] font-semibold text-ink-muted">
                <span>{t("Transactions")}</span>
                <span>{t("{count} rows a page", { count: String(prefs.rowsPerPage) }) + (prefs.compactTables ? ` · ${t("compact")}` : "")}</span>
              </div>
              {sample.map((item) => (
                <div key={item.name} className={cn("flex items-center gap-2.5 border-t border-sunken px-3 text-[13px]", prefs.compactTables ? "py-1.5" : "py-2.5")}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold text-ink">{t(item.name)}</span>
                    <span className="truncate text-[11.5px] text-ink-faint">{`${item.meta} · ${formatDay(item.day, "d MMMM yyyy", fmt)}`}</span>
                  </span>
                  <span className={cn("text-[13px] font-semibold tabular-nums", item.amount < 0 ? "text-loss-ink" : "text-tint-green-ink")}>{(item.amount < 0 ? "−" : "") + formatCurrency(Math.abs(item.amount), "BDT", fmt)}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="sa-rem" className={cn(CARD, "flex items-start gap-3.5 px-5.5 py-4.5")}>
            <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-soft-wash text-income">
              <Bell className="size-4.5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <h2 id="sa-rem" className="text-[15px] leading-[1.35] font-semibold text-ink">
                {t("Looking for reminders?")}
              </h2>
              <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Budget, loan and savings reminders now live in Notifications, with email, SMS and quiet hours.")}</span>
              <Link href="/settings/notifications" className="mt-1 inline-flex w-fit items-center gap-1.25 text-[13px] font-semibold text-emerald hover:underline">
                {t("Open Notifications")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </span>
          </section>
        </div>
      </div>

      <PopupDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        plain
        width={460}
        title={t("Go back to the default preferences?")}
        sub={t("Theme, numbers, dates, money, layout and calendar go back to how Smartly set them. Your language stays as it is.")}
        footer={
          <>
            <Button variant="secondary" size="sm" className="h-9.5 text-[13.5px]" onClick={() => setResetOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button size="sm" className="h-9.5 text-[13.5px]" onClick={() => void reset()}>
              {t("Reset to default")}
            </Button>
          </>
        }
      />
      <PopupDialog open={keysOpen} onClose={() => setKeysOpen(false)} width={460} title={t("Keyboard shortcuts")} sub={t("Press ? on this page to open this list. On a Mac, use Cmd in place of Ctrl.")}>
        {SHORTCUTS.map((group) => (
          <div key={group.group} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t(group.group)}</span>
            {group.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 border-t border-divider py-2 first:border-t-0">
                <span className="text-small text-ink">{t(item.label)}</span>
                <span className="flex gap-1">
                  {item.keys.map((key) => (
                    <Kbd key={key} className={KBD}>{key}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </PopupDialog>
    </PageFrame>
  );
}
