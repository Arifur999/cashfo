"use client";

import { Laptop, Loader2, Shield, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { LoginHistoryEntry, UserSessionSummary } from "@/lib/api";
import { getLoginHistoryAction, getSessionsAction, revokeSessionAction } from "@/lib/authActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Small, obviously-a-phone heuristic on the device label text itself
// (already parsed server-side, see backend device-label.ts) -- just picks
// an icon, nothing security-relevant depends on this.
function DeviceIcon({ label, className }: { label: string; className?: string }) {
  const Icon = /iOS|Android|Mobile/i.test(label) ? Smartphone : Laptop;
  return <Icon className={className} />;
}

// Settings > Security. Two-Factor Authentication and Additional Security
// are shown but disabled ("Coming soon") -- this app has no real SMS/email
// delivery provider configured yet (see CLAUDE.md), so a toggle here that
// LOOKED like it did something without actually enforcing anything at
// login would be actively misleading for a security feature. Device
// Management is real: backed by UserSession rows created at login/register
// (see UserAuthService.issueTokens()) and login-history is the existing
// LoginAttempt table -- both already had the data, this just surfaces it.
export function SecurityTab() {
  const { t } = useLocale();
  const [subTab, setSubTab] = useState<"devices" | "history">("devices");

  const [sessions, setSessions] = useState<UserSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Only ever sets loading FALSE here (the .then() callback, not the effect
  // body itself) -- "true" is the initial useState value, and a caller
  // outside the effect (handleRevoke below) sets it back to true explicitly
  // before calling this again, since setting it synchronously inside a
  // useEffect body triggers React's "cascading renders" lint rule.
  function fetchSessions() {
    getSessionsAction().then((result) => {
      if (result.success && result.data) setSessions(result.data);
      setLoadingSessions(false);
    });
  }

  useEffect(() => {
    fetchSessions();
    getLoginHistoryAction().then((result) => {
      if (result.success && result.data) setHistory(result.data);
      setLoadingHistory(false);
    });
  }, []);

  function handleRevoke(session: UserSessionSummary) {
    if (!window.confirm(`${t("Sign out")} "${session.deviceLabel}"? ${t("That device will need to log in again.")}`)) return;
    setRevokingId(session.id);
    startTransition(async () => {
      const result = await revokeSessionAction(session.id);
      if (result.success) {
        toast.success(t("Device signed out"));
        setLoadingSessions(true);
        fetchSessions();
      } else {
        toast.error(result.message ?? t("Failed to sign out that device"));
      }
      setRevokingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-neutral-900">{t("Two-Factor Authentication")}</h2>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{t("Add an extra layer of security to your account")}</p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700">{t("Enable 2FA")}</p>
            <p className="text-sm text-neutral-500">{t("Send a code to your phone or email when logging in.")}</p>
          </div>
          <span title={t("Coming soon -- no SMS/email provider is configured yet")} className="inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-neutral-200 px-0.5 opacity-60">
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Device Management")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("See where you're signed in")}</p>

        <div className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1" style={{ width: "fit-content" }}>
          <button
            type="button"
            onClick={() => setSubTab("devices")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              subTab === "devices" ? "bg-brand-primary text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t("Devices")}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              subTab === "history" ? "bg-brand-primary text-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t("History")}
          </button>
        </div>

        <div className="mt-4">
          {subTab === "devices" ? (
            loadingSessions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">{t("No active sessions found.")}</p>
            ) : (
              <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                        <DeviceIcon label={s.deviceLabel} className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                          {s.deviceLabel}
                          {s.isCurrent && (
                            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-primary">
                              {t("Current")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {s.isCurrent ? t("Active now") : `${t("Last active")} ${formatDateTime(s.lastUsedAt)}`} · {s.ipAddress}
                        </p>
                      </div>
                    </div>
                    {!s.isCurrent && (
                      <button
                        type="button"
                        disabled={isPending && revokingId === s.id}
                        onClick={() => handleRevoke(s)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {isPending && revokingId === s.id ? t("Signing out...") : t("Sign out")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">{t("No login history yet.")}</p>
          ) : (
            <div className="max-h-80 divide-y divide-neutral-50 overflow-y-auto rounded-xl border border-neutral-100">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{h.deviceLabel}</p>
                    <p className="text-xs text-neutral-400">
                      {h.ipAddress} · {formatDateTime(h.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      h.success ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-danger/10 text-brand-danger"
                    }`}
                  >
                    {h.success ? t("Success") : t("Failed")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Additional Security")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("Configure extra protections")}</p>

        <div className="mt-4 space-y-4">
          {[
            { label: "Login Alerts", description: "Receive email notifications of new logins" },
            { label: "Suspicious Activity", description: "Alert on unusual login attempts" },
            { label: "Reset Protection", description: "Require verification to reset password" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">{t(item.label)}</p>
                <p className="text-sm text-neutral-500">{t(item.description)}</p>
              </div>
              <span
                title={t("Coming soon -- no email provider is configured yet")}
                className="inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-neutral-200 px-0.5 opacity-60"
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
