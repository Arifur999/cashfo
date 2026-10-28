"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IDashboardSystem } from "@/types/dashboard.types";
import { dateTimeLabel } from "./dashboardDates";
import { Section, SectionLink } from "./pieces";

// The API's own health check (GET /health), timed from this server: up
// with how long it took, refused (its database is down), or no answer.
export interface ApiCheck {
  healthy: boolean | null;
  latencyMs: number | null;
}

// An answer slower than this reads "Slow" rather than "Fast".
const SLOW_MS = 800;

type RowTone = "ok" | "warn" | "bad" | "unknown";

interface Row {
  name: string;
  state: string;
  tone: RowTone;
  // A date rather than a verdict: plain ink while all is well.
  plain?: boolean;
}

const DOT: Record<RowTone, string> = { ok: "bg-mint-300", warn: "bg-warning-fill", bad: "bg-expense-fill", unknown: "bg-ink-faint" };
const TEXT: Record<RowTone, string> = { ok: "text-emerald", warn: "text-warning", bad: "text-expense", unknown: "text-ink-muted" };

interface SystemCardProps {
  system: IDashboardSystem;
  api: ApiCheck;
}

// The API, the database, email, the payment gateway, the last backup and
// the day's errors, each with a dot, as the AdminDashboard board lists them.
// "All working" only when the server says every one is.
export function SystemCard({ system, api }: SystemCardProps) {
  const { translate, locale } = useLocale();
  const { database, email, sms, paymentGateway, lastBackup, errors24h } = system;
  const count = (value: number) => formatCount(value, locale);
  const backupSize = lastBackup?.sizeMb != null ? ` · ${count(Math.round(lastBackup.sizeMb))} MB` : "";

  const rows: Row[] = [
    {
      name: translate("API"),
      state:
        api.healthy === null
          ? translate("Unreachable")
          : api.latencyMs === null
            ? translate("Working")
            : translate(api.latencyMs > SLOW_MS ? "Slow · {ms} ms" : "Fast · {ms} ms", { ms: count(api.latencyMs) }),
      tone: api.healthy === null ? "bad" : api.latencyMs !== null && api.latencyMs > SLOW_MS ? "warn" : "ok",
    },
    { name: translate("Database"), state: translate(database.ok ? "Healthy" : "Not reachable"), tone: database.ok ? "ok" : "bad" },
    {
      name: translate("Email (Resend)"),
      state: translate(!email.configured ? "Not set up" : email.lastSendOk === false ? "Last send failed" : "Sending"),
      tone: !email.configured || email.lastSendOk === false ? "warn" : "ok",
    },
    ...(sms
      ? [
          {
            name: translate("SMS (MRAM)"),
            state: translate(!sms.configured ? "Not set up" : sms.lastSendOk === false ? "Last send failed" : "Sending"),
            tone: !sms.configured || sms.lastSendOk === false ? ("warn" as const) : ("ok" as const),
          },
        ]
      : []),
    { name: translate("Payment gateway"), state: translate(paymentGateway.configured ? "Connected" : "Not set up"), tone: paymentGateway.configured ? "ok" : "warn" },
    lastBackup?.completedAt
      ? { name: translate("Last backup"), state: `${dateTimeLabel(lastBackup.completedAt, locale, { t: translate })}${backupSize}`, tone: "ok", plain: true }
      : { name: translate("Last backup"), state: translate("None yet"), tone: "warn" },
    {
      name: translate("Errors, 24 hours"),
      state: errors24h.count === 0 ? translate("None") : translate("{count} new · {high} high", { count: count(errors24h.count), high: count(errors24h.high) }),
      tone: errors24h.count === 0 ? "ok" : "warn",
    },
  ];

  return (
    <Section
      title={translate("System")}
      aside={
        <span className={cn("flex items-center gap-1.5 text-[12.5px] leading-[normal] font-semibold", system.allWorking ? "text-emerald" : "text-warning")}>
          <span aria-hidden="true" className={cn("size-2 rounded-full", system.allWorking ? "bg-mint-300" : "bg-warning-fill")} />
          {translate(system.allWorking ? "All working" : "Needs a look")}
        </span>
      }
      className="h-full gap-2.5"
    >
      <div className="flex flex-1 flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2.5 py-0.75 text-[13.5px] leading-[normal]">
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[row.tone])} />
            <span className="flex-1 text-ink">{row.name}</span>
            <span className={cn("text-right text-[12.5px] font-medium", row.plain && row.tone === "ok" ? "text-ink-2" : TEXT[row.tone])}>{row.state}</span>
          </div>
        ))}
      </div>
      <SectionLink href="/admin/system">{translate("Open System")}</SectionLink>
    </Section>
  );
}
