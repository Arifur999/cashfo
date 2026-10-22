"use client";

import { Check, KeyRound, Laptop, Mail, ShieldCheck, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import IconTile from "@/components/smartly/IconTile";
import { ListCard, ListCell, ListEmpty, ListFooter, ListRow, ListRowActions } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import { Switch } from "@/components/ui/switch";
import type { LoginHistoryEntry, UserSessionSummary } from "@/lib/customer/api";
import { getLoginHistoryAction, getSessionsAction, revokeSessionAction } from "@/lib/customer/authActions";
import { sendSetPasswordLinkAction } from "@/lib/customer/passwordVaultActions";
import { formatTimeAgo, monthsSince } from "@/lib/customer/date";
import { knownIp, signInResult, triedThePassword } from "@/lib/customer/settingsDisplay";
import { settle } from "@/lib/customer/vaultDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { SupportAccessCard } from "./SupportAccessCard";
import { deviceLabelText } from "@/lib/deviceLabel";

// Rows shown at first, and added by each "Show more".
const DEVICE_STEP = 6;
const HISTORY_STEP = 5;
const HISTORY_CAP = 50; // the API sends the newest 50
// What LoadMore brings back into view and focuses (the cards' tables).
const DEVICES_ID = "security-devices";
const HISTORY_ID = "security-history";

const METHODS = [
  { icon: Smartphone, title: "Authenticator app", body: "Google Authenticator, Microsoft Authenticator or a similar app makes a new 6-digit code every 30 seconds. Works without internet." },
  { icon: Mail, title: "Code by email", body: "A code is sent to your email each time you sign in." },
];

const ALERTS = [
  { title: "Email me when a new device signs in", body: "You will know straight away if someone else uses your password." },
  { title: "Warn me about unusual sign-in tries", body: "For example, many wrong passwords in a row." },
  { title: "Ask for a code before a password reset", body: "So nobody can reset your password with just your email." },
];

// "Last changed 4 months ago", or the general advice while it is unknown.
function passwordAge(changedAt: string | null, t: Translate, locale: Locale): string {
  if (!changedAt) return t("Change it any time. Your other devices are signed out when you do.");
  const months = monthsSince(changedAt, new Date());
  if (months === 0) return t("Last changed this month");
  return t(months === 1 ? "Last changed {count} month ago" : "Last changed {count} months ago", { count: formatCount(months, locale) });
}

const isPhone = (label: string) => /android|iphone|ipad|mobile|phone/i.test(label);

// A sign-out that went through: answered, and answered yes.
const signedOut = (settled: PromiseSettledResult<{ success: boolean }>) => settled.status === "fulfilled" && settled.value.success;

// A list's loading state while it is read again after a failure (the
// Loader says "Loading..." in the reader's language).
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
}

// Password, two-step sign-in, the devices signed in and the last tries.
export function SecuritySection({ initialSessions, initialHistory }: SecuritySectionProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [history, setHistory] = useState(initialHistory);
  const [readingSessions, setReadingSessions] = useState(false);
  const [readingHistory, setReadingHistory] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState(DEVICE_STEP);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_STEP);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // A Google-only account has no password to change (older APIs don't say:
  // then it is offered as before). It is offered the email link that sets
  // the first one instead, the forgot-password flow's.
  const hasPassword = user.hasPassword !== false;
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

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

  const others = (sessions ?? []).filter((session) => !session.isCurrent);
  // This device first, then the rest by last use.
  const ordered = [...(sessions ?? [])].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastUsedAt.localeCompare(a.lastUsedAt));
  const tries = history ?? [];

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
      if (gone.size > 0) toast.success(t(gone.size === 1 ? "{count} device signed out" : "{count} devices signed out", { count: formatCount(gone.size, locale) }));
      if (kept > 0) toast.error(t(kept === 1 ? "{count} device couldn't be signed out. Try again." : "{count} devices couldn't be signed out. Try again.", { count: formatCount(kept, locale) }));
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

  // Changing the password signed every other device out, and "Last
  // changed" now reads this month.
  function passwordChanged() {
    setSessions((current) => current?.filter((session) => session.isCurrent) ?? current);
    router.refresh();
  }

  // "Chrome on Windows · 103.4.1.2": the address is what answers "Wasn't you?".
  const tryLine = (entry: LoginHistoryEntry) => {
    const ip = knownIp(entry.ipAddress);
    return (
      <>
        {deviceLabelText(entry.deviceLabel, t)}
        {ip && (
          <>
            {" · "}
            <span className="break-all">{ip}</span>
          </>
        )}
      </>
    );
  };

  return (
    <div className="flex max-w-200 flex-col gap-4">
      <Card padding="none" className="flex flex-wrap items-center gap-4 px-4 py-5 md:px-6">
        <IconTile size={40} tone="money">
          <KeyRound />
        </IconTile>
        <span className="flex min-w-40 flex-1 flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Password")}</h2>
          {/* Polite: the link's address is said where the button was pressed. */}
          <span className="text-small text-ink-muted" aria-live="polite">
            {hasPassword ? passwordAge(user.passwordChangedAt ?? null, t, locale) : linkSentTo ? t("We sent a link to {email}. Open it to set your password.", { email: linkSentTo }) : t("You sign in with Google. Set a password to sign in with your email too.")}
          </span>
        </span>
        {hasPassword ? (
          <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)} className="h-9.5 max-sm:w-full pointer-coarse:h-11">
            {t("Change password")}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={sendSetPasswordLink} disabled={isSending} aria-busy={isSending || undefined} className="h-9.5 max-sm:w-full pointer-coarse:h-11">
            {isSending ? <Loader size={14} label="Loading..." /> : <Mail />}
            {t(linkSentTo ? "Send the link again" : "Set a password")}
          </Button>
        )}
      </Card>

      <SupportAccessCard />

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-start gap-4 px-4 pt-5 pb-4 md:px-6">
          <IconTile size={40} tone="warning">
            <ShieldCheck />
          </IconTile>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="flex flex-wrap items-center gap-2 text-title font-semibold text-ink">
              {t("Two-step sign-in")}
              <Chip tone="neutral" size="sm">
                {t("Coming soon")}
              </Chip>
            </h2>
            <span className="text-small leading-normal text-ink-muted">{t("Ask for a second code when you sign in, so a stolen password alone isn't enough.")}</span>
          </span>
        </div>
        {/* Not ready yet: only the button is set back, the words stay readable. */}
        {METHODS.map((method) => (
          <div key={method.title} className="flex items-center gap-4 border-t border-divider px-4 py-4 md:px-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-strip text-ink-2">
              <method.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{t(method.title)}</span>
              <span className="text-small leading-normal text-ink-muted">{t(method.body)}</span>
            </span>
            <Button variant="secondary" size="sm" disabled>
              {t("Set up")}
            </Button>
          </div>
        ))}
      </Card>

      <ListCard
        id={DEVICES_ID}
        label={t("Where you're signed in")}
        busy={readingSessions}
        header={
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 md:px-6">
            <span className="flex min-w-48 flex-1 flex-col gap-0.5">
              <h2 className="text-title font-semibold text-ink">{t("Where you're signed in")}</h2>
              {sessions && <span className="text-small text-ink-muted">{t(sessions.length === 1 ? "{count} device. Sign out of any you don't recognise." : "{count} devices. Sign out of any you don't recognise.", { count: formatCount(sessions.length, locale) })}</span>}
            </span>
            <Button variant="outline" size="sm" onClick={signOutOthers} disabled={others.length === 0 || isPending} className="border-expense/40 text-expense hover:bg-expense-soft pointer-coarse:h-11">
              {t("Sign out everywhere else")}
            </Button>
          </div>
        }
        footer={
          sessions &&
          ordered.length > DEVICE_STEP && (
            <ListFooter>
              <LoadMore shown={Math.min(deviceLimit, ordered.length)} total={ordered.length} step={DEVICE_STEP} onMore={() => setDeviceLimit((limit) => limit + DEVICE_STEP)} onLess={deviceLimit > DEVICE_STEP ? () => setDeviceLimit(DEVICE_STEP) : undefined} focusTargetId={DEVICES_ID} />
            </ListFooter>
          )
        }
      >
        {sessions === null ? (
          <div role="row">
            <div role="cell">{readingSessions ? READING : <ErrorState bordered={false} title={t("Couldn't load your devices")} onRetry={() => void readSessions()} />}</div>
          </div>
        ) : ordered.length === 0 ? (
          <ListEmpty title={t("No active sessions found.")} className="py-6 text-small" />
        ) : (
          ordered.slice(0, deviceLimit).map((session) => {
            const Icon = isPhone(session.deviceLabel) ? Smartphone : Laptop;
            const ip = knownIp(session.ipAddress);
            return (
              <ListRow key={session.id} className="grid-cols-[38px_minmax(0,1fr)_auto] gap-x-3 md:gap-x-4 md:py-3">
                <ListCell>
                  <span className={cn("flex size-9.5 items-center justify-center rounded-md", session.isCurrent ? "bg-mint-50 text-emerald" : "bg-surface-sunken text-ink-2")}>
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                </ListCell>
                <ListCell className="flex flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                    <span className="truncate">{deviceLabelText(session.deviceLabel, t)}</span>
                    {session.isCurrent && (
                      <Chip tone="income" size="sm">
                        {t("This device")}
                      </Chip>
                    )}
                  </span>
                  <span className="text-small text-ink-muted tabular-nums">
                    {session.isCurrent ? t("Active now") : t("Last active {when}", { when: formatTimeAgo(session.lastUsedAt, t, locale) })}
                    {" · "}
                    {/* An IPv6 address is one long word: it breaks rather than run under the button. */}
                    <span className="break-all">{ip ? t("IP {ip}", { ip }) : t("IP unknown")}</span>
                  </span>
                </ListCell>
                {!session.isCurrent && (
                  <ListRowActions>
                    <Button variant="secondary" size="sm" onClick={() => signOut(session)} disabled={isPending} aria-label={t("Sign out of {device}", { device: deviceLabelText(session.deviceLabel, t) })} className="h-8.5 pointer-coarse:h-11">
                      {busyId === session.id && <Loader size={14} />}
                      {busyId === session.id ? t("Signing out...") : t("Sign out")}
                    </Button>
                  </ListRowActions>
                )}
              </ListRow>
            );
          })
        )}
      </ListCard>

      <ListCard
        id={HISTORY_ID}
        label={t("Recent sign-in activity")}
        busy={readingHistory}
        header={
          <div className="flex flex-col gap-0.5 border-b border-line px-4 py-4 md:px-6">
            <h2 className="text-title font-semibold text-ink">{t("Recent sign-in activity")}</h2>
            <span className="text-small text-ink-muted">{t("The latest tries to sign in to your account, newest first.")}</span>
          </div>
        }
        footer={
          (tries.length > HISTORY_STEP || tries.length >= HISTORY_CAP) && (
            <ListFooter>
              <LoadMore shown={Math.min(historyLimit, tries.length)} total={tries.length} step={HISTORY_STEP} onMore={() => setHistoryLimit((limit) => limit + HISTORY_STEP)} onLess={historyLimit > HISTORY_STEP ? () => setHistoryLimit(HISTORY_STEP) : undefined} focusTargetId={HISTORY_ID} />
              {/* The list stops at the API's cap: said, so 50 doesn't read as the whole count. */}
              {tries.length >= HISTORY_CAP && <p>{t("Only the newest {count} tries are listed.", { count: formatCount(HISTORY_CAP, locale) })}</p>}
            </ListFooter>
          )
        }
      >
        {history === null ? (
          <div role="row">
            <div role="cell">{readingHistory ? READING : <ErrorState bordered={false} title={t("Couldn't load your sign-in activity")} onRetry={() => void readHistory()} />}</div>
          </div>
        ) : tries.length === 0 ? (
          <ListEmpty title={t("No login history yet.")} className="py-6 text-small" />
        ) : (
          tries.slice(0, historyLimit).map((entry) => {
            const when = formatRelativeDateTime(entry.createdAt, { t, locale });
            return (
              // The section's own width decides: from 672px the device and the
              // time get columns of their own, narrower they sit under the result.
              <ListRow key={entry.id} density="dense" className={cn("grid-cols-[22px_minmax(0,1fr)] items-start gap-x-3 tabular-nums @2xl:grid-cols-[22px_minmax(0,1fr)_minmax(0,1.2fr)_150px] @2xl:items-center", !entry.success && "bg-warning-soft/60")}>
                <ListCell>
                  <span className={cn("mt-px flex size-5.5 items-center justify-center rounded-full @2xl:mt-0", entry.success ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}>{entry.success ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : <X className="size-3" strokeWidth={3} aria-hidden="true" />}</span>
                </ListCell>
                <ListCell className="flex flex-col gap-px">
                  <span className={cn("font-semibold", entry.success ? "text-ink" : "text-expense")}>{t(signInResult(entry))}</span>
                  {hasPassword && triedThePassword(entry) && (
                    <span className="text-caption text-warning">
                      {t("Wasn't you?")}{" "}
                      <button type="button" onClick={() => setPasswordOpen(true)} className="inline-flex items-center font-semibold underline pointer-coarse:min-h-11">
                        {t("Change your password")}
                      </button>
                    </span>
                  )}
                  <span className="text-small text-ink-muted @2xl:hidden">
                    {tryLine(entry)} · {when}
                  </span>
                </ListCell>
                <ListCell className="hidden text-ink-2 @2xl:block">{tryLine(entry)}</ListCell>
                <ListCell align="end" className="hidden text-small whitespace-nowrap text-ink-muted @2xl:block">
                  {when}
                </ListCell>
              </ListRow>
            );
          })
        )}
      </ListCard>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <h2 className="flex-1 text-title font-semibold text-ink">{t("Alerts")}</h2>
          <Chip tone="neutral" size="sm">
            {t("Coming soon")}
          </Chip>
        </div>
        {ALERTS.map((alert) => (
          <div key={alert.title} className="flex items-center gap-4 border-t border-divider px-4 py-3 md:px-6">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body font-medium text-ink">{t(alert.title)}</span>
              <span className="text-small text-ink-muted">{t(alert.body)}</span>
            </span>
            <Switch checked={false} disabled aria-label={t(alert.title)} />
          </div>
        ))}
      </Card>

      {hasPassword && <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onChanged={passwordChanged} />}
    </div>
  );
}
