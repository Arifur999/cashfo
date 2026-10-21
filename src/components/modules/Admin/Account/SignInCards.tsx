"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Monitor, Smartphone, X } from "lucide-react";
import { signOutOtherDevicesAction } from "@/app/(dashboardLayout)/admin/account/_action";
import { dateTimeLabel } from "@/components/modules/Admin/Dashboard/dashboardDates";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import IconTile from "@/components/smartly/IconTile";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDateTime, formatElapsed } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { failureReasonLabel } from "@/lib/loginAttempts";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { mySessionsQuery, mySignInsQuery } from "@/queries/myAccount.queries";

const isPhone = (label: string) => /iOS|Android|Mobile/.test(label);

// Sessions last weeks, so an admin can pile up many; the newest are enough.
const DEVICES_SHOWN = 5;

// Every device you're signed in on, this one first, and a way to sign the
// others out (changing your password does that too). While the list loads
// or after it failed, it says so: never an empty list on a security card.
export const DevicesCard = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(mySessionsQuery());
  const sessions = query.data?.data;
  const others = (sessions ?? []).filter((session) => !session.current).length;
  const { run, isPending } = useActionMutation({
    action: () => signOutOtherDevicesAction(),
    successMessage: ({ signedOut }) =>
      signedOut > 0 ? plural(translate, signedOut, "{count} other device signed out", "{count} other devices signed out", { count: formatCount(signedOut, locale) }) : translate("No other device was signed in"),
    invalidateKeys: [queryKeys.myAccount.all],
    refreshRoute: false,
  });

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="text-title text-ink">
          <T>Where you&apos;re signed in</T>
        </h2>
        <Button variant="secondary" size="sm" disabled={isPending || others === 0} className="pointer-coarse:h-11" onClick={() => void run(undefined)}>
          <T>Sign out other devices</T>
        </Button>
      </div>
      {sessions === undefined ? (
        query.isError ? (
          <ErrorState bordered={false} title={translate("Couldn't load your devices")} onRetry={() => void query.refetch()} className="border-t border-divider" />
        ) : (
          <SkeletonRows rows={2} className="border-t border-divider" />
        )
      ) : (
        <ul>
          {sessions.slice(0, DEVICES_SHOWN).map((session) => {
            const Icon = isPhone(session.deviceLabel) ? Smartphone : Monitor;
            return (
              <li key={session.id} className="flex items-center gap-3 border-t border-divider px-5 py-3">
                <IconTile size={36} tone="neutral">
                  <Icon />
                </IconTile>
                <span className="flex min-w-0 grow flex-col">
                  {/* "Chrome on Windows · this computer", then where: "Bangladesh · 203.0.113.24". */}
                  <span className="truncate text-body font-semibold text-ink">
                    {session.current ? `${session.deviceLabel} · ${translate(isPhone(session.deviceLabel) ? "this phone" : "this computer")}` : session.deviceLabel}
                  </span>
                  <span className="truncate text-small text-ink-muted tabular-nums" title={translate("Signed in {when}", { when: formatDateTime(session.signedInAt, "—", locale) })}>
                    {[session.place, session.ipAddress].filter(Boolean).join(" · ") || translate("Unknown place")}
                  </span>
                </span>
                {/* The wait is counted from the clock, which can tick a minute between the server's render and hydration. */}
                <span className={cn("shrink-0 text-small font-semibold", session.current ? "text-emerald" : "text-ink-muted")} title={formatDateTime(session.lastActiveAt, "—", locale)} suppressHydrationWarning>
                  {session.current ? translate("Now") : translate("{time} ago", { time: formatElapsed(session.lastActiveAt, { t: translate, locale }) })}
                </span>
              </li>
            );
          })}
          {sessions.length > DEVICES_SHOWN && (
            <li className="border-t border-divider px-5 py-3 text-small text-ink-muted">
              {plural(translate, sessions.length - DEVICES_SHOWN, "And {count} more device still signed in.", "And {count} more devices still signed in.", { count: formatCount(sessions.length - DEVICES_SHOWN, locale) })}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
};

// The newest tries to sign in with your email, from anywhere: a wrong
// password you didn't type is worth a look, so a failed try also names the
// device it came from. On a phone the address and the time go under it.
export const RecentSignInsCard = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(mySignInsQuery());
  const signIns = query.data?.data;

  return (
    <Card padding="none" className="overflow-hidden">
      <h2 className="px-5 pt-4 pb-3 text-title text-ink">
        <T>Recent sign-ins</T>
      </h2>
      {signIns === undefined ? (
        query.isError ? (
          <ErrorState bordered={false} title={translate("Couldn't load your sign-ins")} onRetry={() => void query.refetch()} className="border-t border-divider" />
        ) : (
          <SkeletonRows rows={3} avatar={false} className="border-t border-divider" />
        )
      ) : signIns.length === 0 ? (
        <p className="border-t border-divider px-5 py-3 text-small text-ink-muted">
          <T>No sign-ins recorded yet.</T>
        </p>
      ) : (
        <ul>
          {signIns.map((attempt) => {
            const when = dateTimeLabel(attempt.createdAt, locale, { t: translate });
            return (
              <li key={attempt.id} className="flex items-start gap-3 border-t border-divider px-5 py-2.5 text-small sm:items-center">
                <span
                  aria-hidden="true"
                  className={cn("mt-px flex size-5.5 shrink-0 items-center justify-center rounded-full sm:mt-0", attempt.success ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense")}
                >
                  {attempt.success ? <Check className="size-3.5" strokeWidth={2.5} /> : <X className="size-3.5" strokeWidth={2.5} />}
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-ink" title={attempt.deviceLabel}>
                    {attempt.success ? translate("Signed in") : failureReasonLabel(attempt.failureReason, translate)}
                  </span>
                  {!attempt.success && attempt.deviceLabel && <span className="truncate text-caption text-ink-muted">{attempt.deviceLabel}</span>}
                  <span className="truncate text-caption text-ink-muted tabular-nums sm:hidden" title={attempt.ipAddress}>
                    {attempt.ipAddress} · {when}
                  </span>
                </span>
                {/* A long (IPv6) address gives way first; the full one is in its title. */}
                <span className="hidden max-w-40 min-w-0 truncate text-ink-muted tabular-nums sm:block" title={attempt.ipAddress}>
                  {attempt.ipAddress}
                </span>
                <span className="hidden w-30 shrink-0 text-right text-ink-muted sm:block" title={formatDateTime(attempt.createdAt, "—", locale)}>
                  {when}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
