"use client";

import { ArrowDown, Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo, monthsSince } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";

export interface SecurityChecks {
  // ISO; null when not known (a Google-only account, an old account).
  passwordChangedAt: string | null;
  hasPassword: boolean;
  twoStep: boolean;
  recovery: boolean;
  appLockAfter: number | null;
  alerts: boolean;
}

const RING = 2 * Math.PI * 35;

// The SettingsSecurity board's side: a score out of 100 (20 a check) with
// what still needs the person, each with a Fix that jumps to its card,
// and the reminder that Smartly never asks for codes.
export function SecurityCheckup({ checks, onFix }: { checks: SecurityChecks; onFix: (id: string) => void }) {
  const { t, fmt } = useLocale();
  const recent = checks.hasPassword && checks.passwordChangedAt !== null && monthsSince(checks.passwordChangedAt, new Date()) < 6;
  const rows = [
    {
      ok: recent,
      title: "Password changed recently",
      note: !checks.hasPassword ? t("You sign in with Google") : checks.passwordChangedAt ? (recent ? t("Changed {when}", { when: formatTimeAgo(checks.passwordChangedAt, t, fmt) }) : t("Over 6 months old")) : t("Not changed in a while"),
      id: "ss-pass",
    },
    { ok: checks.twoStep, title: "Two-step sign-in", note: t(checks.twoStep ? "On with an authenticator app" : "Off"), id: "ss-2fa" },
    { ok: checks.recovery, title: "Recovery email or phone", note: t(checks.recovery ? "Set" : "Not added yet"), id: "ss-rec" },
    { ok: checks.appLockAfter !== null, title: "App lock", note: checks.appLockAfter !== null ? t("PIN after {count} min away", { count: String(checks.appLockAfter) }) : t("Off on this device"), id: "ss-lock" },
    { ok: checks.alerts, title: "Sign-in alerts", note: t(checks.alerts ? "New device and unusual tries" : "Some alerts are off"), id: "ss-alert" },
  ];
  const good = rows.filter((row) => row.ok).length;
  const score = good * 20;
  const tone = score >= 100 ? { ring: "stroke-success", pill: "bg-success-soft text-tint-green-ink", label: "Excellent" } : score >= 60 ? { ring: "stroke-emerald", pill: "bg-primary-soft text-brand-ink", label: "Good" } : { ring: "stroke-progress-low", pill: "bg-warning-soft text-warning", label: "Needs work" };

  return (
    <div className="flex flex-col gap-4 xl:sticky xl:top-4">
      <section aria-labelledby="ss-check" className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-4 px-5 pt-4.5 pb-4">
          <div className="relative size-21 shrink-0">
            <svg viewBox="0 0 84 84" className="size-21 -rotate-90" aria-hidden="true">
              <circle cx="42" cy="42" r="35" fill="none" strokeWidth="9" className="stroke-head-rule" />
              <circle cx="42" cy="42" r="35" fill="none" strokeWidth="9" strokeLinecap="round" className={tone.ring} strokeDasharray={`${((RING * score) / 100).toFixed(1)} ${RING.toFixed(1)}`} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] leading-none font-bold text-ink tabular-nums">{formatCount(score, fmt)}</span>
              <span className="text-[11px] text-ink-faint">/{formatCount(100, fmt)}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="ss-check" className="text-[16px] font-semibold text-ink">
              {t("Security checkup")}
            </h2>
            <span className={cn("inline-flex w-fit items-center rounded-full px-2.25 py-0.5 text-[12px] font-semibold", tone.pill)}>{t(tone.label)}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{score >= 100 ? t("Every check passes. Nice work.") : t("{count} of 5 checks need you. Tap Fix to jump there.", { count: formatCount(5 - good, fmt) })}</span>
          </div>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2.5 border-t border-sunken px-5 py-2.75">
            <span aria-hidden="true" className={cn("flex size-5.5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", row.ok ? "bg-success-soft text-tint-green-ink" : "bg-warning-soft text-warning")}>
              {row.ok ? <Check className="size-3" strokeWidth={3} /> : "!"}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[13.5px] font-medium text-ink">{t(row.title)}</span>
              <span className="truncate text-[12px] text-ink-muted">{row.note}</span>
            </span>
            {!row.ok && (
              <button type="button" onClick={() => onFix(row.id)} className="inline-flex h-7.5 items-center gap-1 rounded-full border border-line px-2.75 text-[12.5px] font-semibold text-emerald hover:bg-primary-soft">
                {t("Fix")}
                <ArrowDown className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </section>

      <section aria-labelledby="ss-never" className="flex gap-3 rounded-[18px] border border-warning-line bg-warning-50 px-4.5 py-4">
        <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 id="ss-never" className="text-body font-semibold text-tip-ink">
            {t("We never ask for your codes")}
          </h2>
          <p className="text-[12.5px] leading-[1.5] text-due-ink">{t("Smartly staff will never ask for your password, PIN or backup codes by phone, SMS or WhatsApp.")}</p>
          <Link href="/settings/help" className="w-fit text-[12.5px] font-semibold text-due-ink underline-offset-2 hover:underline">
            {t("Report something odd")}
          </Link>
        </div>
      </section>
    </div>
  );
}
