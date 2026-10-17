"use client";

import { Check, KeyRound, Laptop, Mail, ShieldCheck, Smartphone, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import { Switch } from "@/components/ui/switch";
import type { LoginHistoryEntry, UserSessionSummary } from "@/lib/customer/api";
import { revokeSessionAction } from "@/lib/customer/authActions";
import { formatDateTime } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

const RECENT = 5;

const METHODS = [
  { icon: Smartphone, title: "Authenticator app", body: "Google Authenticator, Microsoft Authenticator or a similar app makes a new 6-digit code every 30 seconds. Works without internet." },
  { icon: Mail, title: "Code by email", body: "A code is sent to your email each time you sign in." },
];

const ALERTS = [
  { title: "Email me when a new device signs in", body: "You will know straight away if someone else uses your password." },
  { title: "Warn me about unusual sign-in tries", body: "For example, many wrong passwords in a row." },
  { title: "Ask for a code before a password reset", body: "So nobody can reset your password with just your email." },
];

const isPhone = (label: string) => /android|iphone|ipad|mobile|phone/i.test(label);

interface SecuritySectionProps {
  // Read by the server page, so the lists are there on the first paint.
  initialSessions: UserSessionSummary[];
  initialHistory: LoginHistoryEntry[];
}

// Password, two-step sign-in, the devices signed in and the last tries.
export function SecuritySection({ initialSessions, initialHistory }: SecuritySectionProps) {
  const { t } = useLocale();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessions, setSessions] = useState<UserSessionSummary[] | null>(initialSessions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const history = initialHistory;

  const others = (sessions ?? []).filter((session) => !session.isCurrent);

  function signOut(session: UserSessionSummary) {
    setBusyId(session.id);
    startTransition(async () => {
      const result = await revokeSessionAction(session.id);
      setBusyId(null);
      if (result.success) {
        setSessions((current) => (current ?? []).filter((s) => s.id !== session.id));
        toast.success(t("Device signed out"));
      } else {
        toast.error(result.message ?? t("Failed to sign out that device"));
      }
    });
  }

  function signOutOthers() {
    startTransition(async () => {
      let signedOut = 0;
      for (const session of others) {
        const result = await revokeSessionAction(session.id);
        if (result.success) signedOut++;
      }
      setSessions((current) => (current ?? []).filter((s) => s.isCurrent));
      toast.success(`${signedOut} ${t(signedOut === 1 ? "device signed out" : "devices signed out")}`);
    });
  }

  return (
    <div className="flex max-w-200 flex-col gap-4">
      <Card padding="none" className="flex items-center gap-4 px-6 py-5">
        <IconTile size={40} tone="money">
          <KeyRound />
        </IconTile>
        <span className="flex flex-1 flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Password")}</h2>
          <span className="text-small text-ink-muted">{t("Change it any time. Your other devices are signed out when you do.")}</span>
        </span>
        <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)} className="h-9.5">
          {t("Change password")}
        </Button>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-start gap-4 px-6 pt-5 pb-4">
          <IconTile size={40} tone="warning">
            <ShieldCheck />
          </IconTile>
          <span className="flex flex-1 flex-col gap-0.5">
            <h2 className="flex items-center gap-2 text-title font-semibold text-ink">
              {t("Two-step sign-in")}
              <Chip tone="neutral" size="sm">
                {t("Coming soon")}
              </Chip>
            </h2>
            <span className="text-small leading-normal text-ink-muted">{t("Ask for a second code when you sign in, so a stolen password alone isn't enough.")}</span>
          </span>
        </div>
        {METHODS.map((method) => (
          <div key={method.title} className="flex items-center gap-4 border-t border-surface-sunken px-6 py-4 opacity-60">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-cream text-ink-2">
              <method.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{t(method.title)}</span>
              <span className="text-small leading-normal text-ink-muted">{t(method.body)}</span>
            </span>
            <Button variant="secondary" size="sm" disabled>
              {t("Set up")}
            </Button>
          </div>
        ))}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <span className="flex flex-1 flex-col gap-0.5">
            <h2 className="text-title font-semibold text-ink">{t("Where you're signed in")}</h2>
            <span className="text-small text-ink-muted">{sessions === null ? t("Loading...") : `${sessions.length} ${t(sessions.length === 1 ? "device. Sign out of any you don't recognise." : "devices. Sign out of any you don't recognise.")}`}</span>
          </span>
          <Button variant="outline" size="sm" onClick={signOutOthers} disabled={others.length === 0 || isPending} className="border-expense/40 text-expense hover:bg-expense-soft">
            {t("Sign out everywhere else")}
          </Button>
        </div>
        {(sessions ?? []).map((session) => {
          const Icon = isPhone(session.deviceLabel) ? Smartphone : Laptop;
          return (
            <div key={session.id} className="flex items-center gap-4 border-t border-surface-sunken px-6 py-3">
              <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-md", session.isCurrent ? "bg-mint-50 text-emerald" : "bg-surface-sunken text-ink-2")}>
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-body font-semibold text-ink">
                  <span className="truncate">{session.deviceLabel}</span>
                  {session.isCurrent && (
                    <Chip tone="income" size="sm">
                      {t("This device")}
                    </Chip>
                  )}
                </span>
                <span className="text-small text-ink-muted tabular-nums">
                  {session.isCurrent ? t("Active now") : `${t("Last active")} ${formatDateTime(session.lastUsedAt)}`} · IP {session.ipAddress}
                </span>
              </span>
              {!session.isCurrent && (
                <Button variant="secondary" size="sm" onClick={() => signOut(session)} disabled={isPending} className="h-8.5">
                  {busyId === session.id ? t("Signing out...") : t("Sign out")}
                </Button>
              )}
            </div>
          );
        })}
        {sessions !== null && sessions.length === 0 && <div className="border-t border-surface-sunken px-6 py-6 text-small text-ink-muted">{t("No active sessions found.")}</div>}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-0.5 px-6 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Recent sign-in activity")}</h2>
          <span className="text-small text-ink-muted">{t("The last 5 tries to sign in to your account.")}</span>
        </div>
        {history.slice(0, RECENT).map((entry) => (
          <div key={entry.id} className={cn("grid min-h-11.5 items-center gap-x-3 border-t border-surface-sunken px-6 py-2 text-body tabular-nums md:grid-cols-[26px_minmax(0,1fr)_160px_150px]", !entry.success && "bg-warning-soft/60")}>
            <span className={cn("flex size-5.5 items-center justify-center rounded-full", entry.success ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}>{entry.success ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : <X className="size-3" strokeWidth={3} aria-hidden="true" />}</span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className={cn("font-semibold", entry.success ? "text-ink" : "text-expense")}>{entry.success ? t("Signed in") : t("Wrong password")}</span>
              {!entry.success && (
                <span className="text-caption text-warning">
                  {t("Wasn't you?")}{" "}
                  <button type="button" onClick={() => setPasswordOpen(true)} className="font-semibold underline">
                    {t("Change your password")}
                  </button>
                </span>
              )}
            </span>
            <span className="truncate text-ink-2">{entry.deviceLabel}</span>
            <span className="text-small whitespace-nowrap text-ink-muted md:text-right">{formatDateTime(entry.createdAt)}</span>
          </div>
        ))}
        {history.length === 0 && <div className="border-t border-surface-sunken px-6 py-6 text-small text-ink-muted">{t("No login history yet.")}</div>}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4">
          <h2 className="flex-1 text-title font-semibold text-ink">{t("Alerts")}</h2>
          <Chip tone="neutral" size="sm">
            {t("Coming soon")}
          </Chip>
        </div>
        {ALERTS.map((alert) => (
          <div key={alert.title} className="flex items-center gap-4 border-t border-surface-sunken px-6 py-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-body font-medium text-ink-2">{t(alert.title)}</span>
              <span className="text-small text-ink-muted">{t(alert.body)}</span>
            </span>
            <Switch checked={false} disabled aria-label={t(alert.title)} />
          </div>
        ))}
        <p className="border-t border-surface-sunken bg-cream px-6 py-3 text-small text-ink-muted">{t("These switch on once Smartly can send email.")}</p>
      </Card>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
