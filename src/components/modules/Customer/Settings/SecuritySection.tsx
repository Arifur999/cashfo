"use client";

import { Check, KeyRound, Laptop, MailWarning, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import PageFrame from "@/components/smartly/PageFrame";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import LoadMore from "@/components/smartly/LoadMore";
import type { LoginHistoryEntry, SecurityAlerts, UserSessionSummary } from "@/lib/customer/api";
import { getLoginHistoryAction, getSessionsAction, revokeSessionAction } from "@/lib/customer/authActions";
import { formatDate, formatTimeAgo } from "@/lib/customer/date";
import { sendSetPasswordLinkAction } from "@/lib/customer/passwordVaultActions";
import { saveSecurityAlertsAction } from "@/lib/customer/securityActions";
import type { TwoStepStatus } from "@/lib/customer/securityDisplay";
import { DEVICES_ANCHOR, knownIp, signInResult, triedThePassword } from "@/lib/customer/settingsDisplay";
import { settle } from "@/lib/customer/vaultDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { deviceLabelText } from "@/lib/deviceLabel";
import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AppLockCard } from "./AppLockCard";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { RecoveryCard } from "./RecoveryCard";
import { SecurityCheckup } from "./SecurityCheckup";
import { SettingsBack } from "./SettingsBack";
import { SettingSwitch } from "./SettingSwitch";
import { SupportAccessCard } from "./SupportAccessCard";
import { TwoStepCard } from "./TwoStepCard";
import { useAppLock } from "./useAppLock";
import { useVerifyEmail } from "./useVerifyEmail";

// Rows shown at first, and added by each "Show more".
const DEVICE_STEP = 6;
const HISTORY_STEP = 5;
const HISTORY_CAP = 50; // the API sends the newest 50

const CARD_HEAD = "px-4 py-4 md:px-5.5";
const ROW_X = "px-4 md:px-5.5";

const ALERTS: { key: keyof Omit<SecurityAlerts, "emailReady">; title: string; body: string }[] = [
  { key: "alertNewDevice", title: "Email me when a new device signs in", body: "You will know straight away if someone else uses your password." },
  { key: "alertFailedTries", title: "Warn me about unusual sign-in tries", body: "For example, many wrong passwords in a row." },
  { key: "askCodeBeforeReset", title: "Ask for a code before a password reset", body: "So nobody can reset your password with just your email." },
];

// "Last changed 4 months ago", or the general advice while it is unknown.
function passwordAge(changedAt: string | null, t: Translate, locale: FormatLocale): string {
  if (!changedAt) return t("Change it any time. Your other devices are signed out when you do.");
  return t("Last changed {date} · {ago}", { date: formatDate(changedAt, "d MMMM yyyy", locale), ago: formatTimeAgo(changedAt, t, locale) });
}

// The card a checkup's Fix points at: scrolled to and lit for a moment.
const FLASH = ["ring-[3px]", "ring-primary/35"];
function flash(id: string) {
  const card = document.getElementById(id);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.classList.add(...FLASH);
  window.setTimeout(() => card.classList.remove(...FLASH), 1800);
}

const isPhone = (label: string) => /android|iphone|ipad|mobile|phone/i.test(label);

// A sign-out that went through: answered, and answered yes.
const signedOut = (settled: PromiseSettledResult<{ success: boolean }>) => settled.status === "fulfilled" && settled.value.success;

const READING = (
  <div className="flex justify-center py-10">
    <Loader size={24} label="Loading..." />
  </div>
);

interface SecuritySectionProps {
  // Read by the server page, so the lists are there on the first paint;
  // null when one couldn't be read (the card says so, with Try again).
  initialSessions: UserSessionSummary[] | null;
  initialHistory: LoginHistoryEntry[] | null;
  initialTwoStep: TwoStepStatus | null;
  initialAlerts: SecurityAlerts | null;
}

// Password, two-step sign-in, support access, the devices signed in, the
// last tries and the alerts (design-v4 SettingsSecurity). An address not
// verified yet is asked for first: the alerts and reset links go there.
export function SecuritySection({ initialSessions, initialHistory, initialTwoStep, initialAlerts }: SecuritySectionProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [history, setHistory] = useState(initialHistory);
  const [readingSessions, setReadingSessions] = useState(false);
  const [readingHistory, setReadingHistory] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState(DEVICE_STEP);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_STEP);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [alerts, setAlerts] = useState<SecurityAlerts | null>(initialAlerts ?? user.alerts ?? null);
  // A Google-only account has no password to change (older APIs don't say:
  // then it is offered as before). It is offered the email link that sets
  // the first one instead, the forgot-password flow's.
  const hasPassword = user.hasPassword !== false;
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const verify = useVerifyEmail();
  const verified = user.emailVerified ?? Boolean(user.emailVerifiedAt);
  const appLock = useAppLock(user.id);

  // The page read again (after a password change, a language switch): its
  // lists win, unless that read failed while these are fine.
  const [prevSessions, setPrevSessions] = useState(initialSessions);
  if (initialSessions !== prevSessions) {
    setPrevSessions(initialSessions);
    if (initialSessions) setSessions(initialSessions);
  }
  const [prevHistory, setPrevHistory] = useState(initialHistory);
  if (initialHistory !== prevHistory) {
    setPrevHistory(initialHistory);
    if (initialHistory) setHistory(initialHistory);
  }

  // The phone menu's Devices row lands on #devices after Settings' loading
  // screen, which already used up the router's hash scroll.
  useEffect(() => {
    if (window.location.hash === `#${DEVICES_ANCHOR}`) document.getElementById(DEVICES_ANCHOR)?.scrollIntoView({ block: "start" });
  }, []);

  const others = (sessions ?? []).filter((session) => !session.isCurrent);
  // This device first, then the rest by last use.
  const ordered = [...(sessions ?? [])].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastUsedAt.localeCompare(a.lastUsedAt));
  const tries = history ?? [];
  const shownTries = Math.min(historyLimit, tries.length);

  async function readSessions() {
    setReadingSessions(true);
    try {
      const result = await getSessionsAction();
      if (result.success) setSessions(result.data ?? []);
    } catch {
      // Still unread: the card keeps its Try again.
    } finally {
      setReadingSessions(false);
    }
  }

  async function readHistory() {
    setReadingHistory(true);
    try {
      const result = await getLoginHistoryAction();
      if (result.success) setHistory(result.data ?? []);
    } catch {
      // Still unread: the card keeps its Try again.
    } finally {
      setReadingHistory(false);
    }
  }

  function signOut(session: UserSessionSummary) {
    setBusyId(session.id);
    startTransition(async () => {
      const result = await revokeSessionAction(session.id);
      setBusyId(null);
      if (result.success) {
        setSessions((current) => current?.filter((s) => s.id !== session.id) ?? current);
        toast.success(t("Device signed out"));
      } else {
        toast.error(result.message ?? t("Failed to sign out that device"));
      }
    });
  }

  // Each device signed out on its own; one that wasn't stays listed, still
  // able to use the account, and is counted in the error.
  function signOutOthers() {
    const targets = others;
    startTransition(async () => {
      const results = await Promise.allSettled(targets.map((session) => revokeSessionAction(session.id)));
      const gone = new Set(targets.filter((_, index) => signedOut(results[index])).map((session) => session.id));
      setSessions((current) => current?.filter((s) => !gone.has(s.id)) ?? current);
      const kept = targets.length - gone.size;
      if (gone.size > 0) toast.success(t(gone.size === 1 ? "{count} device signed out" : "{count} devices signed out", { count: formatCount(gone.size, fmt) }));
      if (kept > 0) toast.error(t(kept === 1 ? "{count} device couldn't be signed out. Try again." : "{count} devices couldn't be signed out. Try again.", { count: formatCount(kept, fmt) }));
    });
  }

  function sendSetPasswordLink() {
    if (isSending) return;
    startSending(async () => {
      const result = await settle(sendSetPasswordLinkAction());
      if (result.success && result.data) {
        setLinkSentTo(result.data.email);
        toast.success(t("We sent a link to {email}. Open it to set your password.", { email: result.data.email }));
      } else {
        toast.error(t(result.message ?? "We couldn't send the link. Please try again."));
      }
    });
  }

  // Saved as soon as it flips; put back if the save fails.
  function changeAlert(key: (typeof ALERTS)[number]["key"], on: boolean) {
    if (!alerts) return;
    const before = alerts;
    setAlerts({ ...alerts, [key]: on });
    saveSecurityAlertsAction({ [key]: on }).then((result) => {
      if (result.success && result.data) return setAlerts(result.data);
      setAlerts(before);
      toast.error(t(result.message ?? "Couldn't save your alerts"));
    });
  }

  // Changing the password signed every other device out, and "Last
  // changed" now reads this month.
  function passwordChanged() {
    setSessions((current) => current?.filter((session) => session.isCurrent) ?? current);
    router.refresh();
  }

  return (
    <PageFrame className="gap-5.5 leading-[normal]">
      <div className="flex flex-col gap-1">
        <SettingsBack />
        <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Security")}</h1>
        <p className="text-body text-ink-muted">{t("Keep your money records safe: password, two-step sign-in, recovery and app lock.")}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="@container flex min-w-0 flex-col gap-4.5">
      {!verified && (
        <Card padding="none" className="flex flex-wrap items-center gap-3.5 border-warning-line bg-warning-50 px-4 py-4 md:px-5.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-warning-soft text-warning [&_svg]:size-5">
            <MailWarning aria-hidden="true" />
          </span>
          <span className="flex min-w-48 flex-1 flex-col gap-0.5">
            <h2 className="flex flex-wrap items-center gap-2 text-title font-semibold text-ink">
              {t("Verify your email")}
              <Chip tone="warning" className="h-4.5 px-2 text-[11.5px]">
                {t("Not verified")}
              </Chip>
            </h2>
            <span className="text-small leading-normal text-warning-ink" aria-live="polite">
              {verify.sentTo ? t("We sent a link to {email}. Open it to verify your email.", { email: verify.sentTo }) : t("Security alerts and password reset links go to {email}. Confirm it's yours.", { email: user.email })}
            </span>
          </span>
          <Button variant="secondary" size="sm" onClick={verify.send} disabled={verify.sending || readOnly} aria-busy={verify.sending || undefined} className="max-sm:w-full pointer-coarse:h-11">
            {verify.sending && <Loader size={14} />}
            {t(verify.sentTo ? "Send it again" : "Send a verification email")}
          </Button>
        </Card>
      )}

      <Card id="ss-pass" padding="none" className="flex scroll-mt-4 flex-wrap items-center gap-3.5 px-4 py-4.5 md:px-5.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-emerald-soft text-emerald [&_svg]:size-5">
          <KeyRound aria-hidden="true" />
        </span>
        <span className="flex min-w-40 flex-1 flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Password")}</h2>
          {/* Polite: the link's address is said where the button was pressed. */}
          <span className="text-small text-ink-muted" aria-live="polite">
            {hasPassword ? passwordAge(user.passwordChangedAt ?? null, t, fmt) : linkSentTo ? t("We sent a link to {email}. Open it to set your password.", { email: linkSentTo }) : t("You sign in with Google. Set a password to sign in with your email too.")}
          </span>
        </span>
        {hasPassword ? (
          <Button variant="secondary" onClick={() => setPasswordOpen(true)} disabled={readOnly} className="h-9.5 px-3.5 max-sm:w-full pointer-coarse:h-11">
            {t("Change password")}
          </Button>
        ) : (
          <Button variant="secondary" onClick={sendSetPasswordLink} disabled={isSending || readOnly} aria-busy={isSending || undefined} className="h-9.5 px-3.5 max-sm:w-full pointer-coarse:h-11">
            {isSending && <Loader size={14} label="Loading..." />}
            {t(linkSentTo ? "Send the link again" : "Set a password")}
          </Button>
        )}
      </Card>

      <div id="ss-2fa" className="scroll-mt-4 rounded-card">
        <TwoStepCard initialStatus={initialTwoStep} />
      </div>

      <RecoveryCard twoStepOn={Boolean(initialTwoStep?.enabled)} codesLeft={initialTwoStep?.backupCodesLeft ?? 0} onShowCodes={() => flash("ss-2fa")} />

      <AppLockCard />

      <SupportAccessCard />

      <Card id={DEVICES_ANCHOR} padding="none" className="scroll-mt-4 overflow-hidden" aria-busy={readingSessions || undefined}>
        <div className={cn("flex flex-wrap items-center gap-3", CARD_HEAD)}>
          <span className="flex min-w-48 flex-1 flex-col gap-0.5">
            <h2 className="text-title font-semibold text-ink">{t("Where you're signed in")}</h2>
            {sessions && <span className="text-small text-ink-muted">{t(sessions.length === 1 ? "{count} device. Sign out of any you don't recognise." : "{count} devices. Sign out of any you don't recognise.", { count: formatCount(sessions.length, fmt) })}</span>}
          </span>
          <Button variant="secondary" size="sm" onClick={signOutOthers} disabled={others.length === 0 || isPending || readOnly} className="border-expense-line px-3 text-small text-expense hover:bg-expense-soft pointer-coarse:h-11">
            {t("Sign out everywhere else")}
          </Button>
        </div>
        {sessions === null ? (
          <div className="border-t border-divider">{readingSessions ? READING : <ErrorState bordered={false} title={t("Couldn't load your devices")} onRetry={() => void readSessions()} />}</div>
        ) : ordered.length === 0 ? (
          <p className={cn("border-t border-divider py-6 text-small text-ink-muted", ROW_X)}>{t("No active sessions found.")}</p>
        ) : (
          <ul>
            {ordered.slice(0, deviceLimit).map((session) => {
              const Icon = isPhone(session.deviceLabel) ? Smartphone : Laptop;
              const ip = knownIp(session.ipAddress);
              return (
                <li key={session.id} className={cn("flex items-center gap-3.5 border-t border-divider py-3", ROW_X)}>
                  <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-field [&_svg]:size-4.5", session.isCurrent ? "bg-emerald-soft text-emerald" : "bg-surface-sunken text-ink-soft")}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2 text-body font-semibold text-ink">
                      <span className="truncate">{deviceLabelText(session.deviceLabel, t)}</span>
                      {session.isCurrent && (
                        <Chip tone="mint" size="sm">
                          {t("This device")}
                        </Chip>
                      )}
                    </span>
                    <span className="text-[12.5px] text-ink-muted tabular-nums">
                      {session.isCurrent ? t("Active now") : t("Last active {when}", { when: formatTimeAgo(session.lastUsedAt, t, fmt) })}
                      {" · "}
                      {/* An IPv6 address is one long word: it breaks rather than run under the button. */}
                      <span className="break-all">{ip ? t("IP {ip}", { ip }) : t("IP unknown")}</span>
                    </span>
                  </span>
                  {!session.isCurrent && (
                    <Button variant="secondary" size="sm" onClick={() => signOut(session)} disabled={isPending || readOnly} aria-label={t("Sign out of {device}", { device: deviceLabelText(session.deviceLabel, t) })} className="h-8.5 px-3 pointer-coarse:h-11">
                      {busyId === session.id && <Loader size={14} />}
                      {busyId === session.id ? t("Signing out...") : t("Sign out")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {sessions && ordered.length > DEVICE_STEP && (
          <div className={cn("border-t border-divider py-3", ROW_X)}>
            <LoadMore shown={Math.min(deviceLimit, ordered.length)} total={ordered.length} step={DEVICE_STEP} onMore={() => setDeviceLimit((limit) => limit + DEVICE_STEP)} onLess={deviceLimit > DEVICE_STEP ? () => setDeviceLimit(DEVICE_STEP) : undefined} focusTargetId={DEVICES_ANCHOR} />
          </div>
        )}
      </Card>

      <Card id="security-history" padding="none" className="overflow-hidden" aria-busy={readingHistory || undefined}>
        <div className={cn("flex flex-col gap-0.5", CARD_HEAD)}>
          <h2 className="text-title font-semibold text-ink">{t("Recent sign-in activity")}</h2>
          <span className="text-small text-ink-muted">{t(shownTries === 1 ? "The last try to sign in to your account." : "The last {count} tries to sign in to your account.", { count: formatCount(shownTries || HISTORY_STEP, fmt) })}</span>
        </div>
        {history === null ? (
          <div className="border-t border-divider">{readingHistory ? READING : <ErrorState bordered={false} title={t("Couldn't load your sign-in activity")} onRetry={() => void readHistory()} />}</div>
        ) : tries.length === 0 ? (
          <p className={cn("border-t border-divider py-6 text-small text-ink-muted", ROW_X)}>{t("No login history yet.")}</p>
        ) : (
          <ul>
            {tries.slice(0, historyLimit).map((entry) => {
              const when = formatRelativeDateTime(entry.createdAt, { t, locale: fmt });
              const device = deviceLabelText(entry.deviceLabel, t);
              return (
                // From 640px of section the device and the time get columns
                // of their own; narrower they sit under the result.
                <li key={entry.id} className={cn("grid min-h-11.5 grid-cols-[22px_minmax(0,1fr)] items-start gap-x-3 border-t border-divider py-1.5 text-[13.5px] tabular-nums @2xl:grid-cols-[22px_minmax(0,1fr)_160px_150px] @2xl:items-center", ROW_X, !entry.success && "bg-warning-50")}>
                  <span className={cn("mt-px flex size-5.5 items-center justify-center rounded-full @2xl:mt-0", entry.success ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}>{entry.success ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : <X className="size-3" strokeWidth={3} aria-hidden="true" />}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn("font-semibold", entry.success ? "text-ink" : "text-expense")}>{t(signInResult(entry))}</span>
                    {hasPassword && triedThePassword(entry) && (
                      <span className="text-caption text-warning-ink">
                        {t("Wasn't you?")}{" "}
                        <button type="button" onClick={() => setPasswordOpen(true)} disabled={readOnly} className="inline-flex items-center font-semibold underline pointer-coarse:min-h-11">
                          {t("Change your password")}
                        </button>
                      </span>
                    )}
                    <span className="text-small text-ink-muted @2xl:hidden">
                      {device}
                      {knownIp(entry.ipAddress) && ` · ${knownIp(entry.ipAddress)}`} · {when}
                    </span>
                  </span>
                  <span className="hidden text-ink-2 @2xl:block" title={knownIp(entry.ipAddress) ?? undefined}>
                    {device}
                  </span>
                  <span className="hidden text-right whitespace-nowrap text-ink-muted @2xl:block">{when}</span>
                </li>
              );
            })}
          </ul>
        )}
        {(tries.length > HISTORY_STEP || tries.length >= HISTORY_CAP) && (
          <div className={cn("flex flex-col gap-2 border-t border-divider py-3 text-small text-ink-muted", ROW_X)}>
            <LoadMore shown={shownTries} total={tries.length} step={HISTORY_STEP} onMore={() => setHistoryLimit((limit) => limit + HISTORY_STEP)} onLess={historyLimit > HISTORY_STEP ? () => setHistoryLimit(HISTORY_STEP) : undefined} focusTargetId="security-history" />
            {/* The list stops at the API's cap: said, so 50 doesn't read as the whole count. */}
            {tries.length >= HISTORY_CAP && <p>{t("Only the newest {count} tries are listed.", { count: formatCount(HISTORY_CAP, fmt) })}</p>}
          </div>
        )}
      </Card>

      <Card id="ss-alert" padding="none" className="scroll-mt-4 overflow-hidden">
        <div className={cn("flex items-center gap-2.5", CARD_HEAD)}>
          <h2 className="flex-1 text-title font-semibold text-ink">{t("Alerts")}</h2>
          {alerts?.emailReady === false && (
            <Chip tone="neutral" className="h-5.5 px-2.25">
              {t("Email not on yet")}
            </Chip>
          )}
        </div>
        {ALERTS.map((alert) => (
          <div key={alert.key} className={cn("flex items-center gap-3.5 border-t border-divider py-3", ROW_X)}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id={`alert-${alert.key}`} className="text-body font-medium text-ink">
                {t(alert.title)}
              </span>
              <span className="text-[12.5px] text-ink-muted">{t(alert.body)}</span>
            </span>
            <SettingSwitch checked={alerts?.[alert.key] ?? false} disabled={!alerts || readOnly} onCheckedChange={(on) => changeAlert(alert.key, on)} aria-labelledby={`alert-${alert.key}`} />
          </div>
        ))}
        {alerts?.emailReady === false && <p className={cn("border-t border-divider bg-strip py-3 text-[12.5px] text-ink-muted", ROW_X)}>{t("Your choices are saved now. The emails start once Smartly can send email. Two-step sign-in with an authenticator app doesn't need email, so you can use it today.")}</p>}
        {!alerts && <p className={cn("border-t border-divider bg-strip py-3 text-[12.5px] text-ink-muted", ROW_X)}>{t("Couldn't load your alerts.")}</p>}
      </Card>

      {hasPassword && <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onChanged={passwordChanged} otherDevices={others.length} />}
    </div>
        <SecurityCheckup
          onFix={flash}
          checks={{
            passwordChangedAt: user.passwordChangedAt ?? null,
            hasPassword,
            twoStep: Boolean(initialTwoStep?.enabled ?? user.twoFactorEnabled),
            recovery: Boolean(user.recoveryEmail) || Boolean(user.phone && user.phoneVerifiedAt),
            appLockAfter: appLock.on ? appLock.after : null,
            alerts: Boolean(alerts?.alertNewDevice && alerts?.alertFailedTries),
          }}
        />
      </div>
    </PageFrame>
  );
}
