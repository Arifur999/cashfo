"use client";

import { formatDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IBackupStatusSummary } from "@/types/system.types";
import { Section, SectionLink, Unavailable } from "./pieces";

export interface SystemState {
  // null when the health check itself could not be reached.
  healthy: boolean | null;
  backup: IBackupStatusSummary | null;
  unresolvedErrors: number | null;
}

interface SystemCardProps {
  // null when the role can't see system health at all.
  state: SystemState | null;
}

// The API, the database, the last backup and the open errors, each with a
// coloured dot.
export function SystemCard({ state }: SystemCardProps) {
  const { translate } = useLocale();
  if (state === null) {
    return (
      <Section title={translate("System")}>
        <Unavailable>{translate("Only a super admin sees system health.")}</Unavailable>
      </Section>
    );
  }
  const ok = state.healthy === true;
  const errors = state.unresolvedErrors ?? 0;
  const allWell = ok && errors === 0;
  const rows: { name: string; state: string; tone: "ok" | "warn" | "bad" }[] = [
    { name: translate("API"), state: translate(ok ? "Fast" : "Unreachable"), tone: ok ? "ok" : "bad" },
    { name: translate("Database"), state: translate(ok ? "Healthy" : "Not reachable"), tone: ok ? "ok" : "bad" },
    { name: translate("Last backup"), state: state.backup?.lastSuccessfulBackupAt ? formatDateTime(state.backup.lastSuccessfulBackupAt) : translate("None yet"), tone: state.backup?.lastSuccessfulBackupAt ? "ok" : "warn" },
    { name: translate("Errors, 24 hours"), state: `${errors} ${translate("new")}`, tone: errors === 0 ? "ok" : "warn" },
  ];
  const DOT = { ok: "bg-income", warn: "bg-warning-fill", bad: "bg-expense-fill" };
  const TEXT = { ok: "text-emerald", warn: "text-warning", bad: "text-expense" };

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
            <span className={cn("text-right text-small font-medium", row.tone === "ok" && row.name !== translate("Last backup") ? TEXT.ok : row.tone === "ok" ? "text-ink-2" : TEXT[row.tone])}>{row.state}</span>
          </div>
        ))}
      </div>
      <SectionLink href="/admin/system">{translate("Open System")}</SectionLink>
    </Section>
  );
}
