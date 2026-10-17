"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import { busiestNetworkNote, pausedNote } from "@/lib/loginAttempts";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { loginAttemptsSummaryQuery } from "@/queries/security.queries";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const Note = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "expense" | "warning" }) => (
  <span className={cn("text-small", tone === "expense" && "text-expense", tone === "warning" && "text-warning")}>{children}</span>
);

// Failed sign-ins over a day and a week, and who is paused right now.
const LoginKpis = () => {
  const { translate } = useLocale();
  const summary = useQuery(loginAttemptsSummaryQuery()).data?.data;
  const concentrated = Boolean(summary?.busiestNetworkToday && summary.busiestNetworkToday.count > 1);
  const paused = summary?.paused.length ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Kpi
        size="sm"
        label="Failed sign-ins, 24 hours"
        value={formatNumber(summary?.failedLast24h)}
        note={summary && <Note tone={concentrated ? "expense" : "muted"}>{busiestNetworkNote(summary, translate)}</Note>}
      />
      <Kpi size="sm" label="Failed sign-ins, 7 days" value={formatNumber(summary?.failedLast7d)} note={<Note><T>Admin panel and app together</T></Note>} />
      <Kpi size="sm" label="Paused right now" value={formatNumber(summary ? paused : undefined)} note={summary && <Note tone={paused > 0 ? "warning" : "muted"}>{pausedNote(summary, translate)}</Note>} />
    </div>
  );
};

export default LoginKpis;
