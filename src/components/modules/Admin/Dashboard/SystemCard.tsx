"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IBackupStatusSummary } from "@/types/system.types";
import { dateTimeLabel } from "./dashboardDates";
import { backupIsDue } from "./dashboardFigures";
import { COULD_NOT_LOAD, Section, SectionLink, Unavailable } from "./pieces";

export interface SystemState {
  // true when the health check passed; false when the API answered that its
  // database is down; null when the API didn't answer at all.
  healthy: boolean | null;
  // How long the check took from this server, when it passed.
  latencyMs: number | null;
  // null when it couldn't be loaded.
  backup: IBackupStatusSummary | null;
  // Not fixed yet and from the last 24 hours, as the Errors page opens;
  // null when they couldn't be counted.
  unresolvedErrors: number | null;
}

interface SystemCardProps {
  // null when the role can't see system health at all.
  state: SystemState | null;
}

type RowTone = "ok" | "warn" | "bad" | "unknown";

interface Row {
  name: string;
  state: string;
  tone: RowTone;
  // A date rather than a verdict: plain ink while all is well.
  plain?: boolean;
}

const DOT: Record<RowTone, string> = { ok: "bg-income", warn: "bg-warning-fill", bad: "bg-expense-fill", unknown: "bg-ink-faint" };
const TEXT: Record<RowTone, string> = { ok: "text-emerald", warn: "text-warning", bad: "text-expense", unknown: "text-ink-muted" };

// The API, the database, the last backup and the open errors, each with a
// coloured dot. "All working" only when every row is.
export function SystemCard({ state }: SystemCardProps) {
  const { translate, locale } = useLocale();
  if (state === null) {
    return (
      <Section title={translate("System")}>
        <Unavailable>{translate("Only a super admin sees system health.")}</Unavailable>
      </Section>
    );
  }
  const { healthy, latencyMs, backup, unresolvedErrors } = state;
  const lastBackupAt = backup?.lastSuccessfulBackupAt ?? null;
  const rows: Row[] = [
    {
      name: translate("API"),
      state: healthy === null ? translate("Unreachable") : latencyMs === null ? translate("Working") : translate("Working · {ms} ms", { ms: formatCount(latencyMs, locale) }),
      tone: healthy === null ? "bad" : "ok",
    },
    {
      name: translate("Database"),
      state: translate(healthy === true ? "Healthy" : healthy === false ? "Not reachable" : "Couldn't check"),
      tone: healthy === true ? "ok" : healthy === false ? "bad" : "unknown",
    },
    backup === null
      ? { name: translate("Last backup"), state: translate(COULD_NOT_LOAD), tone: "unknown" }
      : lastBackupAt === null
        ? { name: translate("Last backup"), state: translate("None yet"), tone: "warn" }
        : { name: translate("Last backup"), state: dateTimeLabel(lastBackupAt, locale, { t: translate }), tone: backupIsDue(backup.daysSinceLastBackup) ? "warn" : "ok", plain: true },
    {
      name: translate("Errors, 24 hours"),
      state: unresolvedErrors === null ? translate(COULD_NOT_LOAD) : translate("{count} new", { count: formatCount(unresolvedErrors, locale) }),
      tone: unresolvedErrors === null ? "unknown" : unresolvedErrors === 0 ? "ok" : "warn",
    },
  ];
  const allWell = rows.every((row) => row.tone === "ok");

  return (
    <Section
      title={translate("System")}
      aside={
        <span className={cn("flex items-center gap-2 text-small font-semibold", allWell ? "text-emerald" : "text-warning")}>
          <span aria-hidden="true" className={cn("size-2 rounded-full", allWell ? "bg-income" : "bg-warning-fill")} />
          {translate(allWell ? "All working" : "Needs a look")}
        </span>
      }
      className="h-full"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-3 py-0.75 text-body">
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[row.tone])} />
            <span className="flex-1 text-ink">{row.name}</span>
            <span className={cn("text-right text-small font-medium", row.plain && row.tone === "ok" ? "text-ink-2" : TEXT[row.tone])}>{row.state}</span>
          </div>
        ))}
      </div>
      <SectionLink href="/admin/system">{translate("Open System")}</SectionLink>
    </Section>
  );
}
