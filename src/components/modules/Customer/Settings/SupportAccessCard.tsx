"use client";

import { Headset } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import { createSupportCodeAction, getSupportAccessAction, revokeSupportAccessAction, type SupportAccessStatus } from "@/lib/customer/supportAccessActions";
import { settle } from "@/lib/customer/vaultDisplay";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Support can open a read-only view of this account only with a code made
// here: it works once, for 15 minutes, and the customer can take it back
// (which also ends a view that is open). Nobody at Smartly ever needs the
// password for this.
export function SupportAccessCard() {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const [status, setStatus] = useState<SupportAccessStatus | null>(null);
  // The code is shown only to the person who made it, until it is used up,
  // expires or is taken back.
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  // A support view is read-only and can't make codes: say so instead.
  const viewedBySupport = !!user.impersonatedBy;

  useEffect(() => {
    let live = true;
    void settle(getSupportAccessAction()).then((result) => {
      if (live && result.success && result.data) setStatus(result.data);
    });
    return () => {
      live = false;
    };
  }, []);

  // Once a shown code's time is up, it is no use to read out.
  useEffect(() => {
    if (!code) return;
    const left = new Date(code.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => setCode(null), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [code]);

  function makeCode() {
    startTransition(async () => {
      const result = await settle(createSupportCodeAction());
      if (result.success && result.data) {
        setCode(result.data);
        setStatus((current) => (current ? { ...current, active: true, expiresAt: result.data!.expiresAt } : current));
      } else {
        toast.error(t(result.message ?? "Couldn't make a support code"));
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      const result = await settle(revokeSupportAccessAction());
      if (result.success) {
        setCode(null);
        setStatus((current) => (current ? { ...current, active: false, expiresAt: null, viewOpen: false } : current));
        toast.success(t("Support access is off"));
      } else {
        toast.error(t(result.message ?? "Couldn't turn off support access"));
      }
    });
  }

  const until = code?.expiresAt ?? status?.expiresAt ?? null;
  const canTurnOff = !!code || !!status?.active || !!status?.viewOpen;

  return (
    <Card padding="none" className="flex flex-col gap-3.5 px-4 py-4.5 md:px-5.5">
      <div className="flex flex-wrap items-start gap-3.5">
        <IconTile size={40} tone="info">
          <Headset />
        </IconTile>
        <span className="flex min-w-40 flex-1 flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Support access")}</h2>
          <span className="text-small text-ink-muted">
            {t("Support can see your account, read-only, only with a code you make here. We never ask for your password.")}
          </span>
        </span>
        {!viewedBySupport && (
          <Button variant="secondary" size="sm" onClick={makeCode} disabled={isPending} aria-busy={isPending || undefined} className="h-9.5 max-sm:w-full pointer-coarse:h-11">
            {isPending && !code ? <Loader size={14} label="Loading..." /> : null}
            {t(code ? "Make a new code" : "Give support a code")}
          </Button>
        )}
      </div>

      {code && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-strip px-4 py-3" aria-live="polite">
          {/* Latin digits on purpose: support types exactly these. */}
          <span className="font-mono text-h2 font-bold tracking-[0.3em] text-ink" lang="en">
            {code.code}
          </span>
          <span className="flex min-w-40 flex-1 flex-col text-small text-ink-2">
            <span>{t("Read this code to Smartly support. It works once.")}</span>
            <span className="text-ink-muted">{t("Works until {time}", { time: formatRelativeDateTime(code.expiresAt, { t, locale: fmt }) })}</span>
          </span>
        </div>
      )}

      {(status?.viewOpen || (!code && status?.active) || status?.lastViewedAt) && (
        <ul className="flex flex-col gap-1 text-small text-ink-2">
          {status?.viewOpen && <li className="font-semibold text-warning">{t("Support is viewing your account right now.")}</li>}
          {!code && status?.active && until && <li>{t("A support code is waiting until {time}.", { time: formatRelativeDateTime(until, { t, locale: fmt }) })}</li>}
          {status?.lastViewedAt && <li className="text-ink-muted">{t("Support last opened your account {time}.", { time: formatRelativeDateTime(status.lastViewedAt, { t, locale: fmt }) })}</li>}
        </ul>
      )}

      {canTurnOff && !viewedBySupport && (
        <div>
          <Button variant="link" size="sm" onClick={turnOff} disabled={isPending} className="h-auto px-0 text-expense pointer-coarse:min-h-11">
            {t(status?.viewOpen ? "Turn off and end support's view" : "Turn off support access")}
          </Button>
        </div>
      )}
    </Card>
  );
}
