"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Monitor, Smartphone, X } from "lucide-react";
import { signOutOtherDevicesAction } from "@/app/(dashboardLayout)/admin/account/_action";
import Card from "@/components/smartly/Card";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDateTime, formatLogTime, formatRelativeDay } from "@/lib/date";
import { failureReasonLabel } from "@/lib/loginAttempts";
import { queryKeys } from "@/lib/queryKeys";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { lowerFirst } from "@/lib/text";
import { cn } from "@/lib/utils";
import { mySessionsQuery, mySignInsQuery } from "@/queries/myAccount.queries";
import T from "@/components/shared/T";

const isPhone = (label: string) => /iOS|Android|Mobile/.test(label);

// Sessions last weeks, so an admin can pile up many; the newest are enough.
const DEVICES_SHOWN = 5;

// Every device you're signed in on, this one first, and a way to sign the
// others out (changing your password does that too).
export const DevicesCard = () => {
  const { translate } = useLocale();
  const sessions = useQuery(mySessionsQuery()).data?.data ?? [];
  const others = sessions.filter((session) => !session.current).length;
  const { run, isPending } = useActionMutation({
    action: () => signOutOtherDevicesAction(),
    successMessage: ({ signedOut }) =>
      signedOut > 0 ? plural(translate, signedOut, "{count} other device signed out", "{count} other devices signed out") : translate("No other device was signed in"),
    invalidateKeys: [queryKeys.myAccount.all],
    refreshRoute: false,
  });

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="text-title text-ink"><T>Where you&apos;re signed in</T></h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || others === 0}
          className="h-8.5 border-line-strong bg-surface px-3 text-small font-semibold text-ink hover:bg-surface-sunken"
          onClick={() => void run(undefined)}
        >
          <T>Sign out other devices</T>
        </Button>
      </div>
      <ul>
        {sessions.slice(0, DEVICES_SHOWN).map((session) => {
          const Icon = isPhone(session.deviceLabel) ? Smartphone : Monitor;
          return (
            <li key={session.id} className="flex items-center gap-3 border-t border-surface-sunken px-5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="truncate text-body font-semibold text-ink">{session.deviceLabel}</span>
                <span className="truncate text-small text-ink-muted">
                  {[
                    session.ipAddress && translate("IP {ip}", { ip: session.ipAddress }),
                    translate("signed in {when}", { when: lowerFirst(formatRelativeDay(session.signedInAt, { t: translate })) }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className={cn("shrink-0 text-small font-semibold", session.current ? "text-emerald" : "text-ink-muted")} title={formatDateTime(session.lastActiveAt)}>
                {session.current ? translate("This device") : formatLogTime(session.lastActiveAt, { t: translate })}
              </span>
            </li>
          );
        })}
        {sessions.length > DEVICES_SHOWN && (
          <li className="border-t border-surface-sunken px-5 py-3 text-small text-ink-muted">
            {plural(translate, sessions.length - DEVICES_SHOWN, "And {count} more device still signed in.", "And {count} more devices still signed in.")}
          </li>
        )}
      </ul>
    </Card>
  );
};

// The newest tries to sign in with your email, from anywhere: a wrong
// password you didn't type is worth a look.
export const RecentSignInsCard = () => {
  const { translate } = useLocale();
  const signIns = useQuery(mySignInsQuery()).data?.data ?? [];

  return (
    <Card padding="none" className="overflow-hidden">
      <h2 className="px-5 pt-4 pb-3 text-title text-ink"><T>Recent sign-ins</T></h2>
      {signIns.length === 0 ? (
        <p className="border-t border-surface-sunken px-5 py-3 text-small text-ink-muted"><T>No sign-ins recorded yet.</T></p>
      ) : (
        <ul>
          {signIns.map((attempt) => (
            <li key={attempt.id} className="flex items-center gap-3 border-t border-surface-sunken px-5 py-2.5 text-small">
              <span
                aria-hidden="true"
                className={cn("flex size-5.5 shrink-0 items-center justify-center rounded-full", attempt.success ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}
              >
                {attempt.success ? <Check className="size-3.5" strokeWidth={2.5} /> : <X className="size-3.5" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 grow truncate text-ink">
                {attempt.success ? translate("Signed in") : failureReasonLabel(attempt.failureReason, translate)} · {attempt.deviceLabel}
              </span>
              <code className="shrink-0 font-mono text-caption text-ink-muted">{attempt.ipAddress}</code>
              <span className="w-30 shrink-0 text-right text-ink-muted" title={formatDateTime(attempt.createdAt)}>
                {formatLogTime(attempt.createdAt, { t: translate })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
